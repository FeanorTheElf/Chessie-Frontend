import {ChessGame, ChessMove} from "./Chess";

export interface AIFunction {
    findBestMove(state: ChessGame, depth: number): Promise<ChessMove>;
};

export function createSearchWorker(): AIFunction {
    let result = new Worker("dist/worker.bundle.js");
    return {
        findBestMove: (state: ChessGame, depth: number) => {
            result.postMessage({state: state.serialize(), depth});
            return new Promise((resolve: (value?: ChessMove | PromiseLike<ChessMove>) => void, reject: (reason?: any) => void) => {
                result.onmessage = (ev: MessageEvent) => {
                    this.calculating = false;
                    resolve(ChessMove.deserialize(ev.data));
                };
                result.onerror = (ev: ErrorEvent) => {
                    reject(ev.error);
                };
            });
        }
    };
}