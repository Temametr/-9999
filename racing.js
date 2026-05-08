export default class Racing {
    constructor(engine) {
        this.Engine = engine;
        // Библиотека препятствий
        this.shapes = {
            car: {
                w: 3, h: 4,
                pattern: [[0,1,0], [1,1,1], [0,1,0], [1,0,1]]
            },
            truck: { // Длинный грузовик
                w: 3, h: 5,
                pattern: [[0,1,0], [1,1,1], [1,0,1], [1,1,1], [1,0,1]]
            },
            barrier: { // Бетонный блок
                w: 3, h: 2,
                pattern: [[1,1,1], [1,1,1]]
            }
        };
    }

    start() {
        this.player = { x: 4, y: 15 };
        this.enemies = [];
        this.tick = 0;
        this.score = 0;
        this.level = 1;
        this.wallAnim = 0;
        this.gameOver = false;
        
        this.Engine.setScore(0);
        this.Engine.setLines('УР.1');
        this.Engine.clearNext();
    }

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

    checkCollision() {
        let p = { x: this.player.x, y: this.player.y, w: 3, h: 4 };
        for(let e of this.enemies) {
            let shape = this.shapes[e.type];
            
            // Грубая проверка
            if (p.x < e.x + shape.w && p.x + p.w > e.x &&
                p.y < e.y + shape.h && p.y + p.h > e.y) {
                
                // Попиксельная проверка
                for(let r = 0; r < shape.h; r++) {
                    for(let c = 0; c < shape.w; c++) {
                        if(shape.pattern[r][c]) {
                            let absX = e.x + c;
                            let absY = e.y + r;
                            let pLocalX = absX - p.x;
                            let pLocalY = absY - p.y;
                            
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

        // ОРИГИНАЛЬНАЯ ЛОГИКА УСКОРЕНИЯ:
        // Каждые 100 очков повышаем уровень (максимум до 10)
        this.level = Math.min(10, 1 + Math.floor(this.score / 100));
        this.Engine.setLines('УР.' + this.level);

        // Чем выше уровень, тем меньше лимит тиков (выше скорость)
        // На 1 уровне скорость = 12, на 10 уровне = 3 (очень быстро)
        let currentSpeed = Math.max(2, 13 - this.level);

        this.tick++;
        if(this.tick >= currentSpeed) {
            this.tick = 0;
            this.wallAnim = (this.wallAnim + 1) % 4; 

            for(let e of this.enemies) e.y++; 
            
            // Удаляем те, что уехали вниз, и даем очки
            if(this.enemies.length > 0 && this.enemies[0].y > 20) {
                this.enemies.shift();
                this.score += 10;
                this.Engine.setScore(this.score);
            }

            // Спавн новых препятствий с учетом дистанции
            let lastEnemy = this.enemies[this.enemies.length - 1];
            // Дистанция зависит от скорости: чем быстрее игра, тем чуть больше окно для маневра
            let safeDist = lastEnemy ? this.shapes[lastEnemy.type].h + 1 + Math.random() * (4 + this.level/2) : 0;
            
            if(!lastEnemy || lastEnemy.y > safeDist) {
                if(Math.random() > 0.4) {
                    let spawnX = Math.random() > 0.5 ? 1 : 6; 
                    
                    let rand = Math.random();
                    let type = 'car';
                    // Грузовики и блоки начинают появляться чаще на высоких уровнях
                    if (rand > 0.90 - (this.level * 0.01)) type = 'truck';         
                    else if (rand > 0.80 - (this.level * 0.01)) type = 'barrier';  

                    this.enemies.push({ x: spawnX, y: -this.shapes[type].h, type: type });
                }
            }
        }

        if(this.checkCollision()) {
            this.gameOver = true;
            this.Engine.vibrateErr();
        }

        // --- ОТРИСОВКА ---
        this.Engine.ctx.clearRect(0, 0, 200, 400);
        
        // Границы трассы
        for(let r=0; r < this.Engine.ROWS; r++) {
            for(let c=0; c < this.Engine.COLS; c++) {
                let isWall = (c === 0 || c === 9);
                let drawSolid = false;
                if(isWall && (r + this.wallAnim) % 4 < 2) drawSolid = true;
                this.Engine.drawCell(this.Engine.ctx, c, r, drawSolid);
            }
        }

        for(let e of this.enemies) this.drawShape(e.x, e.y, e.type);
        this.drawShape(this.player.x, this.player.y, 'car');
    }

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
    }

    // Для гонок отпускание кнопок теперь ничего не делает
    onInputUp(btn) {}
}
