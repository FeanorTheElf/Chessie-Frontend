import * as React from "react";
import * as Chess from "../logic/Chess";

const promotablePieces:Chess.PieceType[] = [Chess.PieceType.bishop, Chess.PieceType.knight, Chess.PieceType.queen, Chess.PieceType.castle];

const shortCodes:Map<Chess.PieceType, string> = new Map([
    [Chess.PieceType.bishop, "8"],
    [Chess.PieceType.king, "#"],
    [Chess.PieceType.knight, "2"],
    [Chess.PieceType.peasant, "o"],
    [Chess.PieceType.queen, "W"],
    [Chess.PieceType.castle, "M"],
    [Chess.PieceType.none, " "],
]);

export enum ChessSquareState{
    normal,
    active,
    danger,
}

export interface ChessSquareProps {
    piece: Chess.Chesspiece;
    blackField: boolean;
    style?: ChessSquareState;
    y: number;
    x: number;
    onFieldClick: (field: [number, number]) => void;
}

export class ChessSquare extends React.PureComponent<ChessSquareProps, {}>{

    constructor(props: ChessSquareProps){
        super(props);
        this.onFieldClick = this.onFieldClick.bind(this);
    }

    getColor() : string{
        if (this.props.style == ChessSquareState.danger){
            return "danger";
        }else if (this.props.style == ChessSquareState.active){
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
        return <td className={this.getColor() + " " + "chess-cell"} onClick={this.onFieldClick}>
                <div className={"content"}>
                    <Chesspiece piece={this.props.piece}/>
                </div>
                {this.props.children}
            </td>
    }
}

export interface GameInfoProps {
    active: Chess.Color;
    lost?: boolean;
}

export class GameInfo extends React.PureComponent<GameInfoProps, {}>{

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

export interface ChooseChesspieceProps {
    onPieceChoosen: (piece: Chess.PieceType) => void;
    color: Chess.Color
}

export class ChooseChesspiece extends React.PureComponent<ChooseChesspieceProps, {}>{

    render(){
        const options:React.ReactNode[] = promotablePieces.map((piece: Chess.PieceType, i: number, arr: Chess.PieceType[]) =>
        {
            return <td className={"choose-cell"} onClick={this.props.onPieceChoosen.bind(this, piece)} key={piece}>
                    <div className={"content"}><Chesspiece piece={Chess.getWith(this.props.color, piece)}/></div>
                </td>;
        });
        return <table className={"choose-table"}><tbody><tr><th scope={"col"}></th>{options}</tr></tbody></table>;
    }
}

interface ChesspieceProps {
    piece: Chess.Chesspiece;
}

class Chesspiece extends React.PureComponent<ChesspieceProps, {}>{

    render(){
        const pieceColor:string = Chess.getColor(this.props.piece) == Chess.Color.white ? 'white' : 'black';
        const displayChar:string = shortCodes.get(Chess.getPieceType(this.props.piece));
        return <p style={{color: pieceColor}}>{displayChar}</p>;
    }
}