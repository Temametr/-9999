export default class Racing {
    constructor(engine) {
        this.Engine = engine;
        this.carPattern = [
            [0,1,0],
            [1,1,1],
            [0,1,0],
            [1,0,1]
        ];
    }

    start() {
        this.player = { x: 4, y: 15 };
        this.enemies = [];
        this.speed = 15;
        this.tick = 0;
        this.score = 0;
        this.wallAnim = 0;
        this.gameOver = false;
        
        this.Engine.setScore(0);
        this.Engine.setLines('RACE');
        this.Engine.clearNext();
    }

    drawCar(x, y) {
        for(let r=0; r<4; r++) {
            for(let c=0; c<3; c++) {
                if(this.carPattern[r][c] && y+r >= 0 && y+r < this.Engine.ROWS) {
                    this.Engine.drawCell(this.Engine.ctx, x+c, y+r, true);
                }
            }
        }
    }

    checkCollision() {
        for(let e of this.enemies) {
            // Упрощенная проверка столкновения прямоугольников
            if (this.player.x < e.x + 3 && this.player.x + 3 > e.x &&
                this.player.y < e.y + 4 && this.player.y + 4 > e.y) {
                return true;
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

        this.tick++;
        if(this.tick > this.speed) {
            this.tick = 0;
            this.wallAnim = (this.wallAnim + 1) % 2;

            for(let e of this.enemies) e.y++; // Двигаем врагов
            
            // Удаляем проехавших и даем очки
            if(this.enemies.length > 0 && this.enemies[0].y > 20) {
                this.enemies.shift();
                this.score += 10;
                this.Engine.setScore(this.score);
            }

            // Спавним врагов
            let lastEnemy = this.enemies[this.enemies.length - 1];
            if(!lastEnemy || lastEnemy.y > 6) {
                if(Math.random() > 0.5) {
                    let spawnX = Math.random() > 0.5 ? 1 : 6; // Левая или правая полоса
                    this.enemies.push({ x: spawnX, y: -4 });
                }
            }

            // Ускорение со временем
            if(this.score > 0 && this.score % 100 === 0 && this.speed > 3) {
                this.speed--; 
                this.score += 10; // Смещаем чтобы не триггерить повторно
            }
        }

        if(this.checkCollision()) {
            this.gameOver = true;
            this.Engine.vibrateErr();
        }

        // Отрисовка
        this.Engine.ctx.clearRect(0,0, 200, 400);
        
        // Рисуем границы трассы и пустой фон
        for(let r=0; r<this.Engine.ROWS; r++) {
            for(let c=0; c<this.Engine.COLS; c++) {
                let isWall = (c === 0 || c === 9);
                let drawSolid = false;
                if(isWall && (r + this.wallAnim) % 3 !== 0) drawSolid = true;
                this.Engine.drawCell(this.Engine.ctx, c, r, drawSolid);
            }
        }

        this.drawCar(this.player.x, this.player.y);
        for(let e of this.enemies) this.drawCar(e.x, e.y);
    }

    onInput(btn) {
        if(this.gameOver) { if(btn === 'start') this.start(); return; }
        // Границы играбельной зоны: x=1 и x=6 (так как ширина машинки 3)
        if(btn === 'left' && this.player.x > 1) { this.player.x--; this.Engine.vibrate('light'); }
        if(btn === 'right' && this.player.x < 6) { this.player.x++; this.Engine.vibrate('light'); }
        if(btn === 'up' || btn === 'action') this.tick += 5; // Газ / Турбо!
    }
}
