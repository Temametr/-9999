import Tetris from './tetris.js';
import Racing from './racing.js';

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Базовый движок (API для игр)
export const Engine = {
    canvas: document.getElementById('gameCanvas'),
    ctx: document.getElementById('gameCanvas').getContext('2d'),
    nextCtx: document.getElementById('nextCanvas').getContext('2d'),
    ROWS: 20, COLS: 10, CELL_SIZE: 20,
    SOLID: '#111111', EMPTY: '#8b956d', GHOST: '#828c64',
    
    setScore(val) { document.getElementById('score').innerText = val; },
    setLines(val) { document.getElementById('lines').innerText = val; },
    vibrate(type) { if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred(type); },
    vibrateErr() { if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error'); },
    
    drawCell(ctx, x, y, isSolid) {
        const px = x * this.CELL_SIZE, py = y * this.CELL_SIZE;
        if (isSolid) {
            ctx.fillStyle = this.SOLID;
            ctx.fillRect(px + 1, py + 1, this.CELL_SIZE - 2, this.CELL_SIZE - 2);
            ctx.fillStyle = this.EMPTY;
            ctx.fillRect(px + 2, py + 2, this.CELL_SIZE - 4, this.CELL_SIZE - 4);
            ctx.fillStyle = this.SOLID;
            ctx.fillRect(px + 4, py + 4, this.CELL_SIZE - 8, this.CELL_SIZE - 8);
        } else {
            ctx.fillStyle = this.GHOST;
            ctx.fillRect(px + 2, py + 2, this.CELL_SIZE - 4, this.CELL_SIZE - 4);
        }
    },
    clearNext() {
        this.nextCtx.clearRect(0, 0, 80, 80);
        for(let r=0; r<4; r++) for(let c=0; c<4; c++) this.drawCell(this.nextCtx, c, r, false);
    }
};

// Состояние МЕНЮ
const MenuState = {
    options: ['1. ТЕТРИС', '2. ГОНКИ', '3. МАРИО'],
    selected: 0,
    start() {
        Engine.setScore(0);
        Engine.setLines('MENU');
        Engine.clearNext();
    },
    loop() {
        Engine.ctx.clearRect(0, 0, 200, 400);
        for (let r = 0; r < Engine.ROWS; r++) 
            for (let c = 0; c < Engine.COLS; c++) 
                Engine.drawCell(Engine.ctx, c, r, false);

        Engine.ctx.fillStyle = Engine.SOLID;
        Engine.ctx.font = 'bold 20px "Courier New"';
        Engine.ctx.textAlign = 'center';
        Engine.ctx.fillText('ВЫБОР ИГРЫ', 100, 60);

        this.options.forEach((opt, i) => {
            if(i === this.selected) {
                Engine.ctx.fillStyle = Engine.SOLID;
                Engine.ctx.fillRect(10, 110 + i*50 - 20, 180, 30);
                Engine.ctx.fillStyle = Engine.EMPTY;
            } else {
                Engine.ctx.fillStyle = Engine.SOLID;
            }
            Engine.ctx.fillText(opt, 100, 110 + i*50);
            if(i === 2 && i === this.selected) {
                Engine.ctx.font = 'bold 12px "Courier New"';
                Engine.ctx.fillText('(В РАЗРАБОТКЕ)', 100, 110 + i*50 + 20);
                Engine.ctx.font = 'bold 20px "Courier New"';
            }
        });
    },
    onInput(btn) {
        if(btn === 'up') { this.selected = (this.selected - 1 + 3) % 3; Engine.vibrate('light'); }
        if(btn === 'down') { this.selected = (this.selected + 1) % 3; Engine.vibrate('light'); }
        if(btn === 'action' || btn === 'start') {
            if(this.selected === 0) switchGame(new Tetris(Engine));
            else if(this.selected === 1) switchGame(new Racing(Engine));
            else Engine.vibrateErr(); // Марио пока не работает
        }
    }
};

let activeGame = MenuState;
let animationFrameId;

function switchGame(newState) {
    if(activeGame && activeGame.stop) activeGame.stop();
    activeGame = newState;
    if(activeGame && activeGame.start) activeGame.start();
}

function gameLoop() {
    if(activeGame && activeGame.loop) activeGame.loop();
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Привязка управления
// --- ОБНОВЛЕННАЯ СИСТЕМА ВВОДА (ПОДДЕРЖКА ЗАЖАТИЯ КНОПОК) ---
const handleInput = (btn, isDown) => {
    if(btn === 'menu' && isDown) switchGame(MenuState);
    else if(activeGame) {
        if(isDown && activeGame.onInputDown) activeGame.onInputDown(btn);
        else if(!isDown && activeGame.onInputUp) activeGame.onInputUp(btn);
        // Fallback для меню и Тетриса (они работают по старому методу)
        else if(isDown && activeGame.onInput) activeGame.onInput(btn); 
    }
};

const bindBtn = (id, btn) => {
    const el = document.getElementById(id);
    // Срабатывает при касании
    el.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(btn, true); }, {passive: false});
    // Срабатывает при отпускании пальца
    el.addEventListener('touchend', (e) => { e.preventDefault(); handleInput(btn, false); });
    // Для ПК (мышка)
    el.addEventListener('mousedown', (e) => { e.preventDefault(); handleInput(btn, true); });
    el.addEventListener('mouseup', (e) => { e.preventDefault(); handleInput(btn, false); });
    el.addEventListener('mouseleave', (e) => { e.preventDefault(); handleInput(btn, false); });
};

bindBtn('btn-up', 'up'); bindBtn('btn-down', 'down');
bindBtn('btn-left', 'left'); bindBtn('btn-right', 'right');
bindBtn('btn-rotate', 'action'); bindBtn('btn-start', 'start'); bindBtn('btn-menu', 'menu');

switchGame(MenuState);
gameLoop();
