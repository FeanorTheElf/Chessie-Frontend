import * as React from "react";
import * as Chess from "./logic/Chess";
import * as ChessComps from "./ChessComponents";
import * as KI from "./logic/AlphaBetaSearch";
import { ChessMove } from "./logic/Chess";

const blankRow: ChessComps.ChessSquareState[] = new Array<ChessComps.ChessSquareState>(8).fill(ChessComps.ChessSquareState.normal);
const emptyPopups: Map<number, React.ReactNode> = new Map();
const columnLetters: Map<number, string> = new Map([[0, "A"], [1, "B"], [2, "C"], [3, "D"], [4, "E"], [5, "F"], [6, "G"], [7, "H"]]);

const columnHeader:React.ReactNode[] = new Array<number>(8).fill(0)
    .map((val: React.ReactNode, index: number, arr: React.ReactNode[]) =>
{
    return <th key={index + 1}>{columnLetters.get(index)}</th>;
});

function updateTargetFields(state: Chess.ChessGame, from: [number, number]) : ChessComps.ChessSquareState[][]{
    const result:ChessComps.ChessSquareState[][] = new Array<Array<ChessComps.ChessSquareState>>(8);
    result.fill(blankRow);
    const isCheck:[boolean, number, number] = state.isCheck(state.getCurrentPlayer());
    if (isCheck[0]){
        result[isCheck[1]] = blankRow.slice();
        result[isCheck[1]][isCheck[2]] = ChessComps.ChessSquareState.danger;
    }
    if (state.getCurrentPlayer() != Chess.getColor(state.getPiece(from[0], from[1]))){
        return result;
    }
    const newActiveFields: [number, number][] = state.getLegalTargetFields(from);
    for (let activeField of newActiveFields){
        if (result[activeField[0]] == blankRow){
            result[activeField[0]] = blankRow.slice();
        }
        result[activeField[0]][activeField[1]] = ChessComps.ChessSquareState.active;
    }
    return result;
}

export interface MainProps {};

interface MainState {
    state: Chess.ChessGame;

    currentField: [number, number];
    promotionField?: [number, number];
    targetFields: ChessComps.ChessSquareState[][];
    calculating: boolean;

    activePlayerLost: boolean;
    reversed: boolean;
};

function doMove(prevState: MainState, move: Chess.ChessMove) : MainState{
    const newState:Chess.ChessGame = prevState.state.do(move);
    return { 
        calculating: false,
        state: newState, 
        currentField: [-1, -1],
        targetFields: updateTargetFields(newState, [-1, -1]), 
        reversed: prevState.reversed,
        activePlayerLost: newState.isCheckmate(newState.getCurrentPlayer()),
        promotionField: undefined
    };
}

export class Chessboard extends React.PureComponent<MainProps, MainState>{

    constructor(props: MainProps){
        super(props);
        const beginState:Chess.ChessGame = new Chess.ChessGame();
        beginState.init();
        
        this.onFieldClick = this.onFieldClick.bind(this);
        this.reverseChessboard = this.reverseChessboard.bind(this);
        this.onPromotionPieceChoosen = this.onPromotionPieceChoosen.bind(this);
        this.doKIMove = this.doKIMove.bind(this);
        this.receiveMoveFromKI = this.receiveMoveFromKI.bind(this);

        this.state = { 
            calculating: false,
            state: beginState, targetFields: 
            updateTargetFields(beginState, [-1, -1]), 
            currentField: [-1, -1],
            reversed: true,
            activePlayerLost: false
        };
    }

    reverseChessboard() : void{
        this.setState(function (prevState: Readonly<MainState>, props: MainProps): MainState{
            console.log("rotate chessboard");
            return { ...prevState, reversed: !prevState.reversed };
        });
    }

    onFieldClick(field: [number, number]) : void{
        this.setState(function(prevState: Readonly<MainState>, props: MainProps) : MainState{
            if (prevState.calculating)
                return prevState;
            if (prevState.targetFields[field[0]][field[1]] == ChessComps.ChessSquareState.active){
                if (prevState.state.isPromotion(prevState.currentField, field))
                    return { ...prevState, promotionField: field }
                else
                    return doMove(prevState, new Chess.ChessMove(prevState.currentField, field, Chess.PieceType.none));
            }else{
                return {
                    ...prevState,
                    currentField: field, 
                    targetFields: updateTargetFields(prevState.state, field),
                    promotionField: undefined
                };
            }
        });
    }

    onPromotionPieceChoosen(piece: Chess.PieceType) : void{
        this.setState(function(prevState: Readonly<MainState>, props: MainProps) : MainState{
            if (prevState.calculating)
                return prevState;
            return doMove(prevState, new Chess.ChessMove(prevState.currentField, prevState.promotionField, piece));
        });
    }

    getPromotionMenu(y: number) : Map<number, React.ReactNode>{
        const result:Map<number, React.ReactNode> = new Map();
        if (this.state.promotionField != undefined && this.state.promotionField[0] == y){
            result.set(this.state.promotionField[1], 
                <ChessComps.ChooseChesspiece color={this.state.state.getCurrentPlayer()} onPieceChoosen={this.onPromotionPieceChoosen} key={8}/>);
            return result;
        }else{
            return emptyPopups;
        }
    }

    doKIMove() : void{
        this.setState(function (prevState: Readonly<MainState>, props: MainProps): MainState{
            if (prevState.calculating)
                return { ...prevState };
            return {
                ...prevState,
                calculating: true
            }
        }, function (): void {
            KI.asyncBestMove(this.state.state, 6).then(this.receiveMoveFromKI);
            console.log("callback doKIMove finished");
        });
    }

    receiveMoveFromKI(move: ChessMove): void{
        this.setState(function(prevState: Readonly<MainState>, props: MainProps) : MainState{
            return doMove(prevState, move);
        });
    }

    render() : React.ReactNode{
        const rows:React.ReactNode[] = this.state.state.getState().map((val: Chess.Chesspiece[], y: number, arr: Chess.Chesspiece[][]) => 
            {
                return <ChessboardRow 
                            row={val} 
                            key={y} 
                            y={y}
                            styles={this.state.targetFields[y]}
                            onFieldClick={this.onFieldClick}
                            popups={this.getPromotionMenu(y)}>
                    </ChessboardRow>
            }
        );
        if (this.state.reversed)
            rows.reverse();
        return <div className={"chessgame"}>
            <div className={"form-inline"}>
                <ChessComps.GameInfo active={this.state.state.getCurrentPlayer()} lost={this.state.activePlayerLost} />
                <button onClick={this.reverseChessboard}>rotate board</button>
                <button onClick={this.doKIMove}>KI move</button>
                <p>{this.state.calculating}</p>
            </div>
                <table className={"chessboard"}><tbody>
                    <tr><th key={0}></th>{columnHeader}</tr>
                    {rows}
                </tbody></table>
            </div>;
    }
}

interface ChessboardRowProps {
    row: Chess.Chesspiece[];
    styles: ChessComps.ChessSquareState[];
    y: number;
    popups: Map<number, React.ReactNode>;
    onFieldClick: (field: [number, number]) => void;
}

interface ChessboardRowState {}

class ChessboardRow extends React.PureComponent<ChessboardRowProps, ChessboardRowState>{

    render() : React.ReactNode{
        const styles:ChessComps.ChessSquareState[] = this.props.styles;
        const y:number = this.props.y;
        console.log("Render row " + y);
        let els:React.ReactNode[] = this.props.row.map((val: Chess.Chesspiece, x: number, arr: Chess.Chesspiece[]) => 
            {
                return <ChessComps.ChessSquare 
                            key={x} 
                            piece={val} 
                            blackField={(x + y) % 2 == 0} 
                            style={styles[x]}
                            y={y}
                            x={x}
                            onFieldClick={this.props.onFieldClick}>
                        {this.props.popups.has(x) && this.props.popups.get(x)}
                    </ChessComps.ChessSquare>;
            }
        )
        return <tr><th scope={"col"}>{y + 1}</th>{els}</tr>;
    }
}