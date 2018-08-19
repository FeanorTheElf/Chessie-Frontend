import * as React from "react";
import * as Chess from "./Chess";

enum ChessfieldStyle{
    none,
    active,
    danger,
}

const unstyledRow: ChessfieldStyle[] = new Array<ChessfieldStyle>(8).fill(ChessfieldStyle.none);

const columnLetters: Map<number, string> = new Map([
    [0, "A"], [1, "B"], [2, "C"], [3, "D"], [4, "E"], [5, "F"], [6, "G"], [7, "H"]
])

const columnHeader:React.ReactNode[] = new Array<number>(8).fill(0)
    .map((val: React.ReactNode, index: number, arr: React.ReactNode[]) =>
    {
        return <th key={index + 1}>{columnLetters.get(index)}</th>;
});

const shortCodes:Map<Chess.PieceType, string> = new Map([
    [Chess.PieceType.bishop, "8"],
    [Chess.PieceType.king, "#"],
    [Chess.PieceType.knight, "2"],
    [Chess.PieceType.peasant, "o"],
    [Chess.PieceType.queen, "W"],
    [Chess.PieceType.tower, "M"],
    [Chess.PieceType.none, " "],
]);

function updateStyles(state: Chess.ChessGame, from: [number, number]) : ChessfieldStyle[][]{
    const styles:ChessfieldStyle[][] = new Array<Array<ChessfieldStyle>>(8);
    styles.fill(unstyledRow);
    const isCheck:[boolean, number, number] = state.isCheck(state.getCurrentPlayer());
    if (isCheck[0]){
        styles[isCheck[1]] = unstyledRow.slice();
        styles[isCheck[1]][isCheck[2]] = ChessfieldStyle.danger;
    }
    if (state.getCurrentPlayer() != Chess.getColor(state.getPiece(from[0], from[1]))){
        return styles;
    }
    const newActiveFields: [number, number][] = state.getLegalTargetFields(from);
    for (let activeField of newActiveFields){
        if (styles[activeField[0]] == unstyledRow){
            styles[activeField[0]] = unstyledRow.slice();
        }
        styles[activeField[0]][activeField[1]] = ChessfieldStyle.active;
    }
    return styles;
}

export interface MainProps {};

interface MainState {
    state: Chess.ChessGame;
    currentField: [number, number];
    styles: ChessfieldStyle[][];
    activePlayerLost: boolean;
    reversed: boolean;
};

export class Main extends React.Component<MainProps, MainState>{

    constructor(props: MainProps){
        super(props);
        const beginState:Chess.ChessGame = new Chess.ChessGame();
        beginState.init();
        this.state = { state: beginState, styles: 
            updateStyles(beginState, [-1, -1]), 
            currentField: [-1, -1],
            reversed: true,
            activePlayerLost: false };
        this.onFieldClick = this.onFieldClick.bind(this);
    }

    onFieldClick(field: [number, number]) : void{
        this.setState(function(prevState: Readonly<MainState>, props: MainProps) : MainState{
            if (prevState.styles[field[0]][field[1]] == ChessfieldStyle.active){
                const m:Chess.ChessMove = new Chess.ChessMove(prevState.currentField, field);
                const newState:Chess.ChessGame = prevState.state.do(m);
                return { state: newState, 
                    currentField: [-1, -1], 
                    styles: updateStyles(newState, [-1, -1]), 
                    reversed: prevState.reversed,
                    activePlayerLost: newState.isCheckmate(newState.getCurrentPlayer())
                };
            }else{
                return { state: prevState.state, 
                    currentField: field, 
                    styles: updateStyles(prevState.state, field),
                    reversed: prevState.reversed,
                    activePlayerLost: prevState.activePlayerLost
                };
            }
        });
    }

    render() : React.ReactNode{
        const rows:React.ReactNode[] = this.state.state.getState().map((val: Chess.Chesspiece[], y: number, arr: Chess.Chesspiece[][]) => 
            {
                return <ChessboardRow 
                        row={val} 
                        key={y} 
                        y={y}
                        styles={this.state.styles[y]}
                        onFieldClick={this.onFieldClick}>
                    </ChessboardRow>
            }
        ).reverse();
        return <div className={"chessgame"}>
            <ActivePlayer active={this.state.state.getCurrentPlayer()} lost={this.state.activePlayerLost} />
                <table className={"chessboard"}><tbody>
                    <tr><th key={0}></th>{columnHeader}</tr>
                    {rows}
                </tbody></table>
            </div>;
    }
}

interface ChessboardRowProps {
    row: Chess.Chesspiece[];
    styles: ChessfieldStyle[];
    y: number;
    onFieldClick: (field: [number, number]) => void;
}

interface ChessboardRowState {}

class ChessboardRow extends React.PureComponent<ChessboardRowProps, ChessboardRowState>{

    render() : React.ReactNode{
        const styles:ChessfieldStyle[] = this.props.styles;
        const y:number = this.props.y;
        console.log("Render row " + y);
        let els:React.ReactNode[] = this.props.row.map((val: Chess.Chesspiece, x: number, arr: Chess.Chesspiece[]) => 
            {
                return <Chessfield 
                        key={x} 
                        piece={val} 
                        blackField={(x + y) % 2 == 0} 
                        style={styles[x]}
                        y={y}
                        x={x}
                        onFieldClick={this.props.onFieldClick}>
                    </Chessfield>;
            }
        )
        return <tr><th scope={"col"}>{y + 1}</th>{els}</tr>;
    }
}

interface ChessfieldProps {
    piece: Chess.Chesspiece;
    blackField: boolean;
    style?: ChessfieldStyle;
    y: number;
    x: number;
    onFieldClick: (field: [number, number]) => void;
}

interface ChessfieldState {}

class Chessfield extends React.PureComponent<ChessfieldProps, ChessfieldState>{

    constructor(props: ChessfieldProps){
        super(props);
        this.onFieldClick = this.onFieldClick.bind(this);
    }

    getColor() : string{
        if (this.props.style == ChessfieldStyle.danger){
            return "danger";
        }else if (this.props.style == ChessfieldStyle.active){
            return "active";
        }else if (this.props.blackField){
            return "black";
        }else{
            return "white";
        }
    }

    onFieldClick(){
        this.props.onFieldClick([this.props.y, this.props.x]);
    }

    render() : React.ReactNode{
        const pieceColor:string = Chess.getColor(this.props.piece) == Chess.Color.white ? 'white' : 'black';
        const displayChar:string = shortCodes.get(Chess.getPieceType(this.props.piece));
        return <td className={this.getColor() + " " + "chess-cell"} onClick={this.onFieldClick}>
            <p className={"content"} style={{color: pieceColor}}>{displayChar}</p>
            </td>
    }
}

interface ActivePlayerProps {
    active: Chess.Color;
    lost?: boolean;
}

interface ActivePlayerState {}

class ActivePlayer extends React.PureComponent<ActivePlayerProps, ActivePlayerState>{

    getColorName(): string {
        return this.props.active == Chess.Color.white ? "White" : "Black";
    }

    getOtherColorName(): string {
        return this.props.active == Chess.Color.white ? "Black" : "White";
    }

    render() {
        if (this.props.lost != undefined && this.props.lost) {
            return <div>
                <h3>{this.getColorName()} is Checkmate, {this.getOtherColorName()} wins!</h3>
            </div>
        } else {
            return <div>
                <h3>Active Player: {this.getColorName()}</h3>
            </div>
        }
    }
}