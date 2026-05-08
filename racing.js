export default class Racing {
    constructor(engine) {
        this.Engine = engine;
        // Библиотека всех возможных препятствий на дороге
        this.shapes = {
            car: { // Обычная машина (ширина 3)
                w: 3, h: 4,
                pattern: [[0,1,0], [1,1,1], [0,1,0], [1,0,1]]
            },
            truck: { // Длинный грузовик (ширина 3)
                w: 3, h: 5,
                pattern: [[0,1,0], [1,1,1], [1,0,1], [1,1,1], [1,0,1]]
            },
            barrier: { // Обычный бетонный блок (ширина 3)
                w: 3, h: 2,
                pattern: [[1,1,1], [1,1,1]]
            },
            wide_barrier: { // ШИРОКИЙ блок (ширина 5) - нужно объезжать!
                w: 5, h: 2,
                pattern: [[1,1,1,1,1], [1,1,1,1,1]]
            },
            wide_truck: { // ШИРОКИЙ грузовик (ширина 5)
                w: 5, h: 4,
                pattern: [
                    [0,1,1,1,0], 
                    [1,1,1,1,1], 
                    [1,0,1,0,1], 
                    [1,1,1,1,1]
                ]
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
        for(let r=0; r < shape.h; r++) {
            for(let c=0; c < shape.w; c++) {
                if(shape.pattern[r][c] && y+r >= 0 && y+r < this.Engine.ROWS) {
                    this.Engine.drawCell(this.Engine.ctx, x+c, y+r, true);
                }
            }
        }
    }

    // Точная попиксельная проверка столкновений
    checkCollision() {
        let p = { x: this.player.x, y: this.player.y, w: 3, h: 4 };
        for(let e of this.enemies) {
            let shape = this.shapes[e.type];
            
            if (p.x < e.x + shape.w && p.x + p.w > e.x &&
                p.y < e.y + shape.h && p.y + p.h > e.y) {
                
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

        // Автоматическое ускорение каждые 100 очков
        this.level = Math.min(10, 1 + Math.floor(this.score / 100));
        this.Engine.setLines('УР.' + this.level);
        let currentSpeed = Math.max(2, 13 - this.level);

        this.tick++;
        if(this.tick >= currentSpeed) {
            this.tick = 0;
            this.wallAnim = (this.wallAnim + 1) % 4; 

            for(let e of this.enemies) e.y++; 
            
            if(this.enemies.length > 0 && this.enemies[0].y > 20) {
                this.enemies.shift();
                this.score += 10;
                this.Engine.setScore(this.score);
            }

            let lastEnemy = this.enemies[this.enemies.length - 1];
            
            // УМНАЯ ДИСТАНЦИЯ: Чем выше скорость, тем больше нужно места, 
            // чтобы успеть 2-3 раза нажать кнопку для объезда широкого блока
            let safeDist = lastEnemy ? this.shapes[lastEnemy.type].h + 3 + this.level + Math.random() * 2 : 0;
            
            if(!lastEnemy || lastEnemy.y > safeDist) {
                if(Math.random() > 0.4) {
                    let rand = Math.random();
                    let type = 'car';
                    
                    // Шансы появления сложных препятствий растут с уровнем
                    if (rand > 0.90 - (this.level * 0.01)) type = 'wide_truck';
                    else if (rand > 0.80 - (this.level * 0.01)) type = 'wide_barrier';
                    else if (rand > 0.65 - (this.level * 0.01)) type = 'truck';
                    else if (rand > 0.50 - (this.level * 0.01)) type = 'barrier';

                    let spawnX;
                    if (type === 'wide_barrier' || type === 'wide_truck') {
                        // Широкие объекты (ширина 5) оставляют свободным только 1 край
                        spawnX = Math.random() > 0.5 ? 1 : 4; 
                    } else {
                        // Обычные объекты (ширина 3) могут спавниться вообще где угодно (от 1 до 6)
                        const positions = [1, 2, 3, 4, 5, 6];
                        spawnX = positions[Math.floor(Math.random() * positions.length)];
                    }

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
        
        // Отрисовка движущихся границ
        for(let r=0; r < this.Engine.ROWS; r++) {
            for(let c=0; c < this.Engine.COLS; c++) {
                let isWall = (c === 0 || c === 9);
                let drawSolid = false;
                if(isWall && (r + this.wallAnim) % 4 < 2) drawSolid = true;
                this.Engine.drawCell(this.Engine.ctx, c, r, drawSolid);
            }
        }

        // Отрисовка всех объектов на трассе
        for(let e of this.enemies) this.drawShape(e.x, e.y, e.type);
        this.drawShape(this.player.x, this.player.y, 'car');
    }

    onInputDown(btn) {
        if(this.gameOver) { if(btn === 'start') this.start(); return; }
        
        // Машина игрока может перемещаться по координатам X от 1 до 6
        if(btn === 'left' && this.player.x > 1) { 
            this.player.x--; 
            this.Engine.vibrate('light'); 
        }
        if(btn === 'right' && this.player.x < 6) { 
            this.player.x++; 
            this.Engine.vibrate('light'); 
        }
    }

    onInputUp(btn) {}
}
