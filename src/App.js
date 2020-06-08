import React, { useState, useEffect } from 'react';
import './App.css';

const states = ['beenThere',
                'open',
                'blocked',
                'actualBoom',
                'potentialBoom',
                'lastMove',
                'monster',
                'monster2',
                'monster3'
               ]
const boardSize = 20;

const shuffle = (array) => {
  array.sort(() => Math.random() - 0.5);
  return array;
}

const update = (board, row, col) => {
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      const state = board[i][j].state;
      if (i === row && j === col) {
        board[i][j].state = 'lastMove';
      } else if (state === 'lastMove') {
        board[i][j].state = 'beenThere';
      }
    }
  }
  return board;
}

const getRandomCell = () => {
  return  [Math.floor(Math.random()*boardSize),
           Math.floor(Math.random()*boardSize)];
}

const init = (firstMove) => {
  let board = [];
  for (let i = 0; i < boardSize; i++) {
    board[i] = [];
    for (let j = 0; j < boardSize; j++) {
      board[i][j] = {state: 'open' };
      const edges = [0,boardSize-1];
      if (edges.includes(i) && edges.includes(j)) {
        board[i][j]['score'] = '+' + Math.floor(Math.random()*1000);
      }
      if (Math.random()*100 < 40) {
        const boomType = Math.random()*100 < 50 ? 'actual' : 'potential';
          board[i][j].state = `${boomType}Boom`;
      } else if (Math.random()*100 < 20) {
          board[i][j].state = 'blocked';
      }
    }
  }
  let [row,col] = firstMove;
  board[row][col].state = 'lastMove';
  const [row1,row2,row3] = shuffle([...Array(10).keys()].filter((n) => n != row)).slice(0,3);
  const [col1,col2,col3] = shuffle([...Array(10).keys()].filter((n) => n != col)).slice(0,3);
  board[row1][col1].state = 'monster';
  board[row2][col3].state = 'monster2';
  board[row3][col3].state = 'monster3';
  return board;
}

const renderKey = () => {
  return (
    <div id="key" className="key">
      &nbsp;
      {
        states.map((s) => {
          return (
            <div className="keyItemWithLabel">
              <div className={`keyItem ${s}`}/>&nbsp;{s}
            </div>
          )
        })
      }
    </div>
  )
}

const renderBoard = (board, updateBoard, isValid, updateScores, updateMessage) => {
  return (
    <div className="board">
    { board.map((row, i) => {
        return row.map((cell, j) => {
          const type = board[i][j].state;
          const score = board[i][j].score;
          const key = "cell-" + i + "x" + j;
          const validSpace = isValid(i,j);
          return (
            <div key={key}
                 className={`cell ${type} c${i}-${j} ${validSpace ? 'neighbor' : ''}`}
                 onClick={(e) => {
                   if (validSpace) {
                     const newBoard = update(board, i, j);
                     updateMessage(`${i}x${j}: ${type}`);
                     updateScores(10);
                     updateBoard(newBoard, [i,j]);
                   }
                 }}
            ><div className="bonusScore">{score}</div></div>
          )
        })
      })
    }
    </div>
  )
}

const App = (props) => {

  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [numGames, setNumGames] = useState(0);
  const [message, setMessage] = useState(null);
  const [lastMove, setLastMove] = useState(() => getRandomCell());
  const [board, setBoard] = useState(() => {
    return init(lastMove);
  });

  const updateScores = (points) => {
    const newScore = score + points;
    setScore(newScore);
    setMaxScore(Math.max(maxScore,newScore));
    setTotalScore(totalScore+points)
  }

  const updateMessage = (newMsg) => {
    setMessage(newMsg);
  }

  const resetStats = () => {
    setMaxScore(0);
    setTotalScore(0);
    setAvgScore(0);
    setNumGames(0);
  }

  const updateBoard = (board, lastMove) => {
    setBoard(board);
    setLastMove(lastMove);
  }

  const isValid = (row,col) => {
    const x =  [row-1,row,row+1].includes(lastMove[0]) &&
           [col-1,col,col+1].includes(lastMove[1]);
    return x;
  }

  const handleStartOver = () => {
    const firstMove = getRandomCell()
    setLastMove(firstMove);
    setBoard(init(firstMove));
    setScore(0);
    const totalGames = numGames + 1;
    setNumGames(totalGames);
    setAvgScore(totalScore/totalGames);

  }

  return (
    <div className="App">
      <div className="left">
        <div className="controls">
          <div>
            <button onClick={()=>handleStartOver()}>Start Over</button>
            </div>
          <div><button>Buy Safe Move</button> -50pts</div>
          <div>Score: {score}</div>
          {message && (<div>{message}</div>)}
        </div>
      </div>
      { renderBoard(board, updateBoard, isValid, updateScores, updateMessage) }
      <div className="right">
        <div className="controls">
          <div>Num Skulls: 65</div>
          <div>Num Bombs: 10</div>
          <div>Possibilty of Bomb: 25%</div>
          <div>Best Score: {maxScore}</div>
          <div>Average Score: {Math.round(avgScore,2)}</div>
          <div><button onClick={resetStats}>Reset stats</button></div>
        </div>
      </div>
    </div>
  );
}

export default App;
