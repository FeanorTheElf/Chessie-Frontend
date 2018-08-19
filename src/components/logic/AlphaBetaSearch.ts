import {ChessGame, ChessMove, Color, getColor, Chesspiece, PieceType, getPieceType} from "./Chess";

function getReasonableMoves(state: ChessGame): ChessMove[]{
    const result:ChessMove[] = [];
    const player:Color = state.getCurrentPlayer();
    for (let y:number = 0; y < 8; ++y){
        for (let x:number = 0; x < 8; ++x){
            if (getColor(state.getPiece(y, x)) == player){
                const from:[number, number] = [y, x];
                for (let to of state.getTargetFields(from)){
                    if (state.isPromotion(from, to)){
                        result.push(new ChessMove(from, to, PieceType.queen));
                        result.push(new ChessMove(from, to, PieceType.knight));
                    }else{
                        result.push(new ChessMove(from, to));
                    }
                }
            }
        }
    }
    return result;
}

const values:Map<PieceType, number> = new Map([
    [PieceType.bishop, 30],
    [PieceType.castle, 50],
    [PieceType.knight, 30],
    [PieceType.peasant, 10],
    [PieceType.queen, 90]
]);

function simpleEval(state: ChessGame): number{
    let result: number = 0;
    let whiteHasKing: boolean = false;
    let blackHasKing: boolean = false;
    for (let y:number = 0; y < 8; ++y){
        for (let x:number = 0; x < 8; ++x){
            const piece: Chesspiece = state.getPiece(y, x);
            if (getColor(piece) == Color.white){
                if (getPieceType(piece) == PieceType.king)
                    whiteHasKing = true;
                else {
                    if (piece == Chesspiece.white_peasant)
                        result += y;
                    result += values.get(getPieceType(piece));
                }
            }else if (getColor(piece) == Color.black){
                if (getPieceType(piece) == PieceType.king)
                    blackHasKing = true;
                else {
                    if (piece == Chesspiece.black_peasant)
                        result += 7 - y;
                    result -= values.get(getPieceType(piece));
                }
            }
        }
    }
    if (!whiteHasKing)
        return -1000;
    if (!blackHasKing)
        return 1000;
    return result;
}

function rekDeepMinEval(state: ChessGame, depth: number, parentMax: number): number{
    if (depth <= 0)
        return simpleEval(state);
    let current:number = 10000;
    for (let move of getReasonableMoves(state)){
        const evaluation:number = rekDeepMaxEval(state.do(move), depth - 1, current);
        if (evaluation < current)
            current = evaluation;
        if (current < parentMax)
            return current;
    }
    return current;
}

function rekDeepMaxEval(state: ChessGame, depth: number, parentMin: number): number
{
    if (depth <= 0)
        return simpleEval(state);
    let current:number = -10000;
    for (let move of getReasonableMoves(state)){
        const evaluation:number = rekDeepMinEval(state.do(move), depth - 1, current);
        if (evaluation > current)
            current = evaluation;
        if (current > parentMin)
            return current;
    }
    return current;
}

export function getBestMove(state: ChessGame, depth: number): ChessMove{
    const minimize:boolean = state.getCurrentPlayer() == Color.black;
    let current:number = minimize ? 20000 : -20000;
    let currentMove:ChessMove = undefined;
    for (let move of getReasonableMoves(state)){
        const evaluation:number = minimize ? rekDeepMaxEval(state.do(move), depth - 1, current) :
                rekDeepMinEval(state.do(move), depth - 1, current);
        if (minimize && evaluation < current){
            current = evaluation;
            currentMove = move;
        }else if (!minimize && evaluation > current){
            current = evaluation;
            currentMove = move;
        }
    }
    return currentMove;
}

export function asyncBestMove(state: ChessGame, depth: number): Promise<ChessMove>{
    return Promise.resolve([state, depth]).then((data: [ChessGame, number]) => getBestMove(data[0], data[1]));
}