
export enum Chesspiece{
    white_peasant =     0x10,
    white_castle =      0x11,
    white_knight =      0x12,
    white_bishop =      0x13,
    white_queen =       0x14,
    white_king =        0x15,

    black_peasant =     0x30,
    black_castle =      0x31,
    black_knight =      0x32,
    black_bishop =      0x33,
    black_queen =       0x34,
    black_king =        0x35,

    none =              0x26,
}

export enum Color{
    white = 0x10,
    black = 0x30,
    none = 0x20,
}

export enum PieceType{
    peasant = 0x0,
    castle = 0x1,
    knight = 0x2,
    bishop = 0x3,
    queen = 0x4,
    king = 0x5,
    none = 0x6,
}

export function getColor(piece:Chesspiece) : Color{
    return piece & 0xF0;
}

export function getWith(color:Color, type:PieceType) : Chesspiece{
    if (color == Color.none || type == PieceType.none){
        return Chesspiece.none;
    }
    return color | type;
}

export function getPieceType(piece:Chesspiece) : PieceType{
    return piece & 0x0F;
}

function otherColor(color:Color) : Color{
    return 0x40 - color;
}

export class ChessMove{
    private from: [number, number];
    private to: [number, number];
    private promoteTo: PieceType;

    constructor(from: [number, number], to: [number, number], promoteTo?: PieceType){
        this.from = from;
        this.to = to;
        this.promoteTo = promoteTo == undefined ? PieceType.none : promoteTo;
    }

    serialize(): any {
        return {
            fromRow: this.from[0],
            fromCol: this.from[1],
            toRow: this.to[0],
            toCol: this.to[1],
            promote: this.promoteTo
        };
    }

    static deserialize(serialized: any): ChessMove {
        return new ChessMove([serialized.fromRow, serialized.fromCol], [serialized.toRow, serialized.toCol], serialized.promote);
    }

    getPromoteTo() : PieceType{
        return this.promoteTo;
    }

    getFrom() : [number, number]{
        return this.from;
    }

    getTo() : [number, number]{
        return this.to;
    }
}

const towerDeltas:[number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const bishopDeltas:[number, number][] = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
const knightDeltas:[number, number][] = [[2, -1], [2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2]];
const kingDeltas:[number, number][] = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]];
const emptyRow:Chesspiece[] = [Chesspiece.none, Chesspiece.none, Chesspiece.none, Chesspiece.none,
    Chesspiece.none, Chesspiece.none, Chesspiece.none, Chesspiece.none];

export class ChessGame {
    private state: Array<Array<Chesspiece>>;
    private current: Color;
    private rightCastlingPossible: Map<Color, boolean>;
    private leftCastlingPossible: Map<Color, boolean>;
    private targetFieldFunctions:Map<PieceType, (field:[number, number], color:Color, result:[number, number][]) => void>;

    constructor(){
        this.state = [[], [], [], [], [], [], [], []];
        this.rightCastlingPossible = new Map();
        this.leftCastlingPossible = new Map();
        this.current = Color.white;
        this.targetFieldFunctions = new Map([
            [PieceType.peasant, this.addPeasantFields.bind(this)],
            [PieceType.castle, this.addTowerFields.bind(this)],
            [PieceType.knight, this.addKnightFields.bind(this)],
            [PieceType.bishop, this.addBishopFields.bind(this)],
            [PieceType.queen, (field:[number, number], color:Color, result:[number, number][]) => {
                this.addTowerFields(field, color, result);
                this.addBishopFields(field, color, result);
            }],
            [PieceType.none, (field:[number, number], color:Color, result:[number, number][]) => {}],
            [PieceType.king, this.addKingFields.bind(this)]
        ])
    }

    private exists(y:number, x:number) : boolean{
        return y >= 0 && y < 8 && x >= 0 && y < 8;
    }

    init() : void{
        const a:Chesspiece[] = [Chesspiece.white_castle, Chesspiece.white_knight, Chesspiece.white_bishop, Chesspiece.white_queen, 
            Chesspiece.white_king, Chesspiece.white_bishop, Chesspiece.white_knight, Chesspiece.white_castle];
        const b:Chesspiece[] = new Array<Chesspiece>(8).fill(Chesspiece.white_peasant);
        const g:Chesspiece[] = new Array<Chesspiece>(8).fill(Chesspiece.black_peasant);
        const h: Chesspiece[] = [Chesspiece.black_castle, Chesspiece.black_knight, Chesspiece.black_bishop, Chesspiece.black_queen,
            Chesspiece.black_king, Chesspiece.black_bishop, Chesspiece.black_knight, Chesspiece.black_castle];
        this.state = [a, b, emptyRow, emptyRow, emptyRow, emptyRow, g, h];
        this.rightCastlingPossible = new Map([[Color.white, true], [Color.black, true]]);
        this.leftCastlingPossible = new Map([[Color.white, true], [Color.black, true]])
        this.current = Color.white;
    }

    getState() : Chesspiece[][]{
        return this.state;
    }

    serialize(): any {
        return {
            state: this.state, 
            current: this.current, 
            rightCastlingPossible: 
            this.rightCastlingPossible, 
            leftCastlingPossible: this.leftCastlingPossible
        };
    }

    static deserialize(serialized: any): ChessGame{
        let result = new ChessGame();
        result.state = serialized.state;
        result.rightCastlingPossible = serialized.rightCastlingPossible;
        result.leftCastlingPossible = serialized.rightCastlingPossible;
        result.current = serialized.current;
        return result;
    }

    getPiece(y:number, x:number) : Chesspiece{
        if (!this.exists(y, x)){
            return Chesspiece.none;
        }
        return this.state[y][x];
    }

    private addField(y:number, x:number, controllingPlayer:Color, result:[number, number][]) : boolean{
        if (!this.exists(y, x)){
            return true;
        }else if (this.getPiece(y, x) == Chesspiece.none){
            result.push([y, x]);
            return false;
        }else if (getColor(this.getPiece(y, x)) == controllingPlayer){
            return true;
        }else{
            result.push([y, x]);
            return true;
        }
    }

    private addDeltaField(field:[number, number], delta:[number, number], controllingPlayer:Color, result:[number, number][], mult?: number) : boolean{
        let multiplyDelta:number = 1;
        if (mult != undefined){
            multiplyDelta = mult;
        }
        return this.addField(field[0] + delta[0] * multiplyDelta, field[1] + delta[1] * multiplyDelta, controllingPlayer, result);
    }

    private addFieldsInLine(field:[number, number], delta:[number, number], controllingPlayer:Color, result:[number, number][]) : void{
        for (let k = 1; k < 8; ++k){
            if (this.addDeltaField(field, delta, controllingPlayer, result, k))
                break;
        }
    }

    private addDeltaFields(field:[number, number], deltas:[number, number][], controllingPlayer:Color, result:[number, number][]) : void{
        for (let delta of deltas)
            this.addDeltaField(field, delta, controllingPlayer, result);
    }

    private addTowerFields(field:[number, number], controllingPlayer:Color, result:[number, number][]) : void{
        for (let delta of towerDeltas)
            this.addFieldsInLine(field, delta, controllingPlayer, result);
    }

    private addBishopFields(field:[number, number], controllingPlayer:Color, result:[number, number][]) : void{
        for (let delta of bishopDeltas)
            this.addFieldsInLine(field, delta, controllingPlayer, result);
    }

    private addKingFields(field:[number, number], controllingPlayer:Color, result:[number, number][]) : void{
        this.addDeltaFields(field, kingDeltas, controllingPlayer, result);
        const color: Color = getColor(this.getPiece(field[0], field[1]));
        const y: number = color == Color.white ? 0 : 7;
        if (this.leftCastlingPossible.get(color) &&
            this.getPiece(y, 1) == Chesspiece.none &&
            this.getPiece(y, 2) == Chesspiece.none &&
            this.getPiece(y, 3) == Chesspiece.none &&
            !this.isAnyAttacked([[y, 2], [y, 3], [y, 4]], otherColor(color))) {
            result.push([y, 2]);
        }
        if (this.rightCastlingPossible.get(color) &&
            this.getPiece(y, 5) == Chesspiece.none &&
            this.getPiece(y, 6) == Chesspiece.none &&
            !this.isAnyAttacked([[y, 4], [y, 5], [y, 6]], otherColor(color))) {
            result.push([y, 6]);
        }
    }

    private addKnightFields(field:[number, number], controllingPlayer:Color, result:[number, number][]) : void{
        this.addDeltaFields(field, knightDeltas, controllingPlayer, result);
    }

    private addPeasantFields(field:[number, number], controllingPlayer:Color, result:[number, number][]) : void{
        const y:number = field[0];
        const x:number = field[1];
        let dy:number = 0;
        if (controllingPlayer == Color.white){
            dy = 1;
        }else{
            dy = -1;
        }
        if (this.exists(y + dy, x) && this.getPiece(y + dy, x) == Chesspiece.none)
            result.push([y + dy, x]);
        if (this.exists(y + dy, x + 1) && getColor(this.getPiece(y + dy, x + 1)) == otherColor(controllingPlayer))
            this.addField(y + dy, x + 1, controllingPlayer, result);
        if (this.exists(y + dy, x - 1) && getColor(this.getPiece(y + dy, x - 1)) == otherColor(controllingPlayer))
            this.addField(y + dy, x - 1, controllingPlayer, result);
        if ((y == 1 && controllingPlayer == Color.white) || (y == 6 && controllingPlayer == Color.black))
            if (this.getPiece(y + 2 * dy, x) == Chesspiece.none)
                result.push([y + 2 * dy, x]);
    }

    getTargetFields(from:[number, number]) : [number, number][]{
        let result:[number, number][] = [];
        const piece:Chesspiece = this.getPiece(from[0], from[1]);
        const color:Color = getColor(piece);

        this.targetFieldFunctions.get(getPieceType(piece))(from, color, result);
        return result;
    }

    private isAnyFieldTargetOf(from: [number, number], targets: [number, number][]): boolean{
        const piece: Chesspiece = this.getPiece(from[0], from[1]);
        return targets.some((first: [number, number], i: number, arr: [number, number][]) => {
            //used to increase performance and prevent endless recursion since a getTargetFields() call on a king might check for a castling
            if ((getPieceType(piece) == PieceType.king || getPieceType(piece) == PieceType.peasant) && Math.abs(first[0] - from[0]) > 1) {
                return false;
            }
            return this.getTargetFields(from).some((second: [number, number], i: number, arr: [number, number][]) => {
                return first[0] == second[0] && first[1] == second[1];
            });
        });
    }

    private isAnyAttacked(fields: [number, number][], opponent: Color): boolean {
        for (let y: number = 0; y < 8; ++y) {
            for (let x: number = 0; x < 8; ++x) {
                const piece: Chesspiece = this.state[y][x];
                if (piece != Chesspiece.none && getColor(piece) == opponent && this.isAnyFieldTargetOf([y, x], fields)) {
                    return true;
                }
            }
        }
        return false;
    }

    getCurrentPlayer() : Color{
        return this.current;
    }

    isCheck(player:Color) : [boolean, number, number]{
        let piecePositions:[number, number][] = [];
        let kingPosition:[number, number] = [-1, -1];
        for (let y = 0; y < 8; ++y){
            for (let x = 0; x < 8; ++x){
                const piece:Chesspiece = this.state[y][x];
                if (piece != Chesspiece.none && getPieceType(piece) == PieceType.king && getColor(piece) == player){
                    kingPosition = [y, x];
                }else if (piece != Chesspiece.none && getColor(piece) == otherColor(player)){
                    piecePositions.push([y, x]);
                }
            }
        }
        for (let field of piecePositions){
            if (this.getTargetFields(field).filter((val: [number, number], i, arr) => {
                return val[0] == kingPosition[0] && val[1] == kingPosition[1]
            }).length > 0){
                return [true, kingPosition[0], kingPosition[1]];
            }
        }
        return [false, kingPosition[0], kingPosition[1]];
    }

    getLegalTargetFields(from: [number, number]): [number, number][] {
        return this.getTargetFields(from).filter((to: [number, number], i: number, arr: [number, number][]) => {
            return !this.do(new ChessMove(from, to)).isCheck(getColor(this.state[from[0]][from[1]]))[0];
        });
    }

    isCheckmate(player: Color): boolean {
        for (let y: number = 0; y < 8; ++y) {
            for (let x: number = 0; x < 8; ++x) {
                const piece: Chesspiece = this.getPiece(y, x);
                if (getColor(piece) == player && this.getLegalTargetFields([y, x]).length > 0) {
                    return false;
                }
            }
        }
        return this.isCheck(player)[0]
    }

    isPromotion(from: [number, number], to: [number, number]): boolean{
        return (to[0] == 0 && this.getCurrentPlayer() == Color.black && this.getPiece(from[0], from[1]) == Chesspiece.black_peasant) || 
            (to[0] == 7 && this.getCurrentPlayer() == Color.white && this.getPiece(from[0], from[1]) == Chesspiece.white_peasant);
    }

    private testForDisableCastling(m: ChessMove, piece: Chesspiece, result: ChessGame) : void{
        const color:Color = getColor(piece);
        const type:PieceType = getPieceType(piece);
        const castleY:number = color == Color.black ? 7 : 0;
        function castlingImpossible(castleY:number) : boolean{
            return type == PieceType.king || (
                type == PieceType.castle && m.getFrom()[0] == castleY && m.getFrom()[1] == castleY);
        }
        if (this.leftCastlingPossible.get(color) && castlingImpossible(0)){
            result.leftCastlingPossible.set(color, false);
        }
        if (this.rightCastlingPossible.get(color) && castlingImpossible(7))
        {
            result.rightCastlingPossible.set(color, false);
        }
    }

    private doCastling(m: ChessMove, king: Chesspiece): void {
        const y: number = m.getFrom()[0];
        const x: number = m.getFrom()[1];
        const toX: number = m.getTo()[1];

        this.state[y][x] = Chesspiece.none;
        this.state[m.getTo()[0]][toX] = king;
        if (toX > x) {
            const castle: Chesspiece = this.state[y][7];
            this.state[y][7] = Chesspiece.none;
            this.state[y][5] = castle;
        } else {
            const castle: Chesspiece = this.state[y][0];
            this.state[y][0] = Chesspiece.none;
            this.state[y][3] = castle;
        }
    }

    private copy(changedRow1: number, changedRow2: number) : ChessGame{
        let result:ChessGame = new ChessGame();
        result.state[changedRow1] = this.state[changedRow1].slice();
        if (changedRow1 != changedRow2)
            result.state[changedRow2] = this.state[changedRow2].slice();
        for (let color of [Color.white, Color.black]) {
            result.rightCastlingPossible.set(color, this.rightCastlingPossible.get(color));
            result.leftCastlingPossible.set(color, this.leftCastlingPossible.get(color));
        }
        for (let y:number = 0; y < 8; ++y){
            if (y != changedRow1 && y != changedRow2){
                result.state[y] = this.state[y];
            }
        }
        return result;
    }

    do(m: ChessMove) : ChessGame{
        const fromY:number = m.getFrom()[0];
        const toY:number = m.getTo()[0];
        const piece:Chesspiece = this.getPiece(fromY, m.getFrom()[1]);
        if (piece != Chesspiece.none){
            const result:ChessGame = this.copy(fromY, toY);

            if (getPieceType(piece) == PieceType.king && Math.abs(m.getFrom()[1] - m.getTo()[1]) > 1) {
                result.doCastling(m, piece);
            } else {
                result.state[fromY][m.getFrom()[1]] = Chesspiece.none;
                result.state[toY][m.getTo()[1]] = piece;
                this.testForDisableCastling(m, piece, result);
                if (this.isPromotion(m.getFrom(), m.getTo())){
                    result.state[toY][m.getTo()[1]] = getWith(this.current, m.getPromoteTo());
                }
            }

            result.current = otherColor(this.current);
            return result;
        }
        return this;
    }
}