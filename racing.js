export default class Racing {
    constructor(engine) {
        this.Engine = engine;
        // Библиотека шейпов (фигур)
        this.shapes = {
            car: {
                w: 3, h: 4,
                pattern: [[0,1,0], [1,1,1], [0,1,0], [1,0,1]]
            },
            truck: { // Большое препятствие
                w: 3, h: 5,
                pattern: [[0,1,0], [1,1,1], [1,0,1], [1,1,1], [1,0,1]]
            },
            barrier: { // Сплошной блок
                w: 3, h: 2,
                pattern: [[1,1,1], [1,1,1]]
            }
        };
    }

    start() {
        this.player = { x: 4, y: 15 };
        this.enemies = [];
        this.baseSpeed = 12; // Чем меньше число, тем быстрее игра
        this.tick = 0;
        this.score = 0;
        this.wallAnim = 0;
        this.gameOver = false;
        this.isAccelerating = false; // Состояние педали газа
        
        this.Engine.setScore(0);
        this.Engine.setLines('RACE');
        this.Engine.clearNext();
    }

    // Универсальная отрисовка объектов
    drawShape(x, y, shapeId) {
        const shape = this.shapes[shapeId];
        for(let r=0; r<shape.h; r++) {
            for(let c=0; c<shape.w; c++) {
                if(shape.pattern[r][c] && y+r >= 0 && y+r < this.Engine.ROWS) {
                    this.Engine.drawCell(this.Engine.ctx, x+c, y+r, true);
                }
            }
        }
    }

    // Попиксельная проверка столкновений
    checkCollision() {
        let p = { x: this.player.x, y: this.player.y, w: 3, h: 4 };
        for(let e of this.enemies) {
            let shape = this.shapes[e.type];
            
            // Сначала грубая проверка (рядом ли они вообще)
            if (p.x < e.x + shape.w && p.x + p.w > e.x &&
                p.y < e.y + shape.h && p.y + p.h > e.y) {
                
                // Затем точная проверка по пикселям
                for(let r = 0; r < shape.h; r++) {
                    for(let c = 0; c < shape.w; c++) {
                        if(shape.pattern[r][c]) {
                            let absX = e.x + c;
                            let absY = e.y + r;
                            let pLocalX = absX - p.x;
                            let pLocalY = absY - p.y;
                            
                            // Если пиксель препятствия накладывается на пиксель игрока
                            if(pLocalX >= 0 && pLocalX < p.w && pLocalY >= 0 && pLocalY < p.h) {
                                if(this.shapes.car.pattern[pLocalY][pLocalX]) return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    loop() {
        if(this.gameOver) {
            this.Engine.ctx.fillStyle = 'rgba(139, 149, 109, 0.85)';
            this.Engine.ctx.fillRect(0, 170, 200, 60);
            this.Engine.ctx.fillStyle = this.Engine.SOLID;
            this.Engine.ctx.font = 'bold 20px "Courier New"';
            this.Engine.ctx.textAlign = 'center';
            this.Engine.ctx.fillText('АВАРИЯ!', 100, 200);
            return;
        }

        // Логика "Турбо": если зажата кнопка, лимит тиков уменьшается в 3 раза
        let currentSpeedLimit = this.isAccelerating ? Math.max(1, Math.floor(this.baseSpeed / 3)) : this.baseSpeed;

        this.tick++;
        if(this.tick >= currentSpeedLimit) {
            this.tick = 0;
            this.wallAnim = (this.wallAnim + 1) % 4; // Анимация обочины

            for(let e of this.enemies) e.y++; // Двигаем препятствия вниз
            
            // Удаляем те, что уехали вниз, и даем очки
            if(this.enemies.length > 0 && this.enemies[0].y > 20) {
                this.enemies.shift();
                // Бонус за рискованную езду: с зажатым газом дают больше очков
                this.score += this.isAccelerating ? 20 : 10;
                this.Engine.setScore(this.score);
                
                // Усложнение (игра сама по себе ускоряется со временем)
                if (this.score % 200 === 0 && this.baseSpeed > 3) {
                    this.baseSpeed -= 1;
                }
            }

            // Спавн новых препятствий
            let lastEnemy = this.enemies[this.enemies.length - 1];
            // Высчитываем безопасную дистанцию, чтобы игрок мог маневрировать
            let safeDist = lastEnemy ? this.shapes[lastEnemy.type].h + 2 + Math.random() * 3 : 0;
            
            if(!lastEnemy || lastEnemy.y > safeDist) {
                if(Math.random() > 0.4) {
                    let spawnX = Math.random() > 0.5 ? 1 : 6; // Левая или правая полоса
                    
                    // Выбираем тип (с вероятностями)
                    let rand = Math.random();
                    let type = 'car';
                    if (rand > 0.85) type = 'truck';         // 15% шанс на длинный грузовик
                    else if (rand > 0.70) type = 'barrier';  // 15% шанс на блок

                    this.enemies.push({ x: spawnX, y: -this.shapes[type].h, type: type });
                }
            }
        }

        // Проверяем ДТП
        if(this.checkCollision()) {
            this.gameOver = true;
            this.Engine.vibrateErr();
        }

        // --- ОТРИСОВКА КАДРА ---
        this.Engine.ctx.clearRect(0, 0, 200, 400);
        
        // Рисуем границы трассы (движущиеся прерывистые линии)
        for(let r=0; r < this.Engine.ROWS; r++) {
            for(let c=0; c < this.Engine.COLS; c++) {
                let isWall = (c === 0 || c === 9);
                let drawSolid = false;
                if(isWall && (r + this.wallAnim) % 4 < 2) drawSolid = true;
                this.Engine.drawCell(this.Engine.ctx, c, r, drawSolid);
            }
        }

        // Рисуем врагов
        for(let e of this.enemies) {
            this.drawShape(e.x, e.y, e.type);
        }
        
        // Рисуем игрока
        this.drawShape(this.player.x, this.player.y, 'car');
    }

    // Вызывается при ЗАЖАТИИ кнопки
    onInputDown(btn) {
        if(this.gameOver) { if(btn === 'start') this.start(); return; }
        
        if(btn === 'left' && this.player.x > 1) { 
            this.player.x--; 
            this.Engine.vibrate('light'); 
        }
        if(btn === 'right' && this.player.x < 6) { 
            this.player.x++; 
            this.Engine.vibrate('light'); 
        }
        
        // Жмем педаль газа
        if(btn === 'up' || btn === 'action') {
            this.isAccelerating = true;
        }
    }

    // Вызывается при ОТПУСКАНИИ кнопки
    onInputUp(btn) {
        // Отпускаем педаль газа
        if(btn === 'up' || btn === 'action') {
            this.isAccelerating = false;
        }
    }
}
