export default class Tetris {
    constructor(engine) {
        this.Engine = engine;
        this.tetrominoes = {
            'I': [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
            'J': [[1,0,0], [1,1,1], [0,0,0]],
            'L': [[0,0,1], [1,1,1], [0,0,0]],
            'O': [[1,1], [1,1]],
            'S': [[0,1,1], [1,1,0], [0,0,0]],
            'Z': [[1,1,0], [0,1,1], [0,0,0]],
            'T': [[0,1,0], [1,1,1], [0,0,0]]
        };
    }

    start() {
        this.playfield = Array.from({length: this.Engine.ROWS}, () => Array(this.Engine.COLS).fill(0));
        this.sequence = []; this.score = 0; this.linesCleared = 0;
        this.gameOver = false; this.tetromino = null; this.nextTetrominoType = null;
        this.count = 0; this.speed = 35;
        this.Engine.setScore(0); this.Engine.setLines(0);
        this.spawnTetromino();
    }

    getNext() {
        if(this.sequence.length === 0) {
            const shapes = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
            while(shapes.length) this.sequence.push(shapes.splice(Math.floor(Math.random() * shapes.length), 1)[0]);
        }
        return this.sequence.pop();
    }

    rotate(matrix) {
        const N = matrix.length - 1;
        return matrix.map((row, i) => row.map((val, j) => matrix[N - j][i]));
    }

    isValid(matrix, cellRow, cellCol) {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] && (cellCol + c < 0 || cellCol + c >= this.Engine.COLS || cellRow + r >= this.Engine.ROWS || this.playfield[cellRow + r][cellCol + c])) {
                    return false;
                }
            }
        }
        return true;
    }

    spawnTetromino() {
        if(!this.nextTetrominoType) this.nextTetrominoType = this.getNext();
        const type = this.nextTetrominoType;
        const matrix = this.tetrominoes[type];
        const col = this.playfield[0].length / 2 - Math.ceil(matrix[0].length / 2);
        const row = type === 'I' ? -1 : 0;
        
        this.tetromino = { name: type, matrix: matrix, row: row, col: col };
        if(!this.isValid(this.tetromino.matrix, this.tetromino.row, this.tetromino.col)) {
            this.gameOver = true; this.Engine.vibrateErr(); return;
        }
        this.nextTetrominoType = this.getNext();
        this.drawNext();
    }

    drawNext() {
        this.Engine.clearNext();
        if(this.gameOver) return;
        const matrix = this.tetrominoes[this.nextTetrominoType];
        const offsetCol = this.nextTetrominoType === 'O' ? 1 : (this.nextTetrominoType === 'I' ? 0 : 0.5);
        const offsetRow = this.nextTetrominoType === 'I' ? 0.5 : 1;
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c]) this.Engine.drawCell(this.Engine.nextCtx, c + offsetCol, r + offsetRow, true);
            }
        }
    }

    placeTetromino() {
        for (let r = 0; r < this.tetromino.matrix.length; r++) {
            for (let c = 0; c < this.tetromino.matrix[r].length; c++) {
                if (this.tetromino.matrix[r][c]) this.playfield[this.tetromino.row + r][this.tetromino.col + c] = 1;
            }
        }
        let lines = 0;
        for (let r = this.Engine.ROWS - 1; r >= 0; r--) {
            if (this.playfield[r].every(cell => !!cell)) {
                this.playfield.splice(r, 1);
                this.playfield.unshift(Array(this.Engine.COLS).fill(0));
                lines++; r++;
            }
        }
        if (lines > 0) {
            this.linesCleared += lines;
            this.score += [0, 100, 300, 500, 800][lines];
            this.Engine.setScore(this.score); this.Engine.setLines(this.linesCleared);
            this.Engine.vibrate('heavy');
        }
        this.spawnTetromino();
    }

    loop() {
        this.Engine.ctx.clearRect(0, 0, 200, 400);
        for(let r=0; r<this.Engine.ROWS; r++) for(let c=0; c<this.Engine.COLS; c++) {
            this.Engine.drawCell(this.Engine.ctx, c, r, !!this.playfield[r][c]);
        }

        if(this.gameOver) {
            this.Engine.ctx.fillStyle = 'rgba(139, 149, 109, 0.85)';
            this.Engine.ctx.fillRect(0, 170, 200, 60);
            this.Engine.ctx.fillStyle = this.Engine.SOLID;
            this.Engine.ctx.font = 'bold 20px "Courier New"';
            this.Engine.ctx.textAlign = 'center';
            this.Engine.ctx.fillText('КОНЕЦ ИГРЫ', 100, 200);
            return;
        }

        if(this.tetromino) {
            if(++this.count > this.speed) {
                this.count = 0;
                this.tetromino.row++;
                if(!this.isValid(this.tetromino.matrix, this.tetromino.row, this.tetromino.col)) {
                    this.tetromino.row--; this.placeTetromino();
                }
            }
            for (let r = 0; r < this.tetromino.matrix.length; r++) {
                for (let c = 0; c < this.tetromino.matrix[r].length; c++) {
                    if (this.tetromino.matrix[r][c] && this.tetromino.row + r >= 0) {
                        this.Engine.drawCell(this.Engine.ctx, this.tetromino.col + c, this.tetromino.row + r, true);
                    }
                }
            }
        }
    }

    onInput(btn) {
        if(this.gameOver) { if(btn === 'start') this.start(); return; }
        if(btn === 'left') {
            const col = this.tetromino.col - 1;
            if(this.isValid(this.tetromino.matrix, this.tetromino.row, col)) { this.tetromino.col = col; this.Engine.vibrate('light'); }
        }
        if(btn === 'right') {
            const col = this.tetromino.col + 1;
            if(this.isValid(this.tetromino.matrix, this.tetromino.row, col)) { this.tetromino.col = col; this.Engine.vibrate('light'); }
        }
        if(btn === 'action' || btn === 'up') {
            const matrix = this.rotate(this.tetromino.matrix);
            if(this.isValid(matrix, this.tetromino.row, this.tetromino.col)) { this.tetromino.matrix = matrix; this.Engine.vibrate('light'); }
        }
        if(btn === 'down') {
            const row = this.tetromino.row + 1;
            if(!this.isValid(this.tetromino.matrix, row, this.tetromino.col)) {
                this.tetromino.row = row - 1; this.placeTetromino();
            } else this.tetromino.row = row;
        }
    }
}
