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

const randomState = () => {
  return states[Math.floor(Math.random() * states.length)];
}

const getRandomBoard = () => {
  let board = [];
  for (let i = 0; i < boardSize; i++) {
    board[i] = [];
    for (let j = 0; j < boardSize; j++) {
      board[i][j] = { state: randomState() }
    }
  }
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

const renderBoard = (board, setBoard, updateScores, updateMessage) => {
  return (
    <div className="board">
    { board.map((row, i) => {
        return row.map((cell, j) => {
          const type = board[i][j].state;
          const key = "cell-" + i + "x" + j;
          return (
            <div key={key}
                 className={`cell ${type}`}
                 onClick={(e) => {
                   console.log(`${i}x${j} was clicked`);
                   console.log('pretending to send json back to server');
                   const newBoard = getRandomBoard();
                   console.log('pretending to get json back from server');
                   console.log(newBoard);
                   updateMessage(`${i}x${j}: ${type}`);
                   updateScores(10);

                   setBoard(newBoard);
                 }}
            />
          )
        })
      })
    }
    </div>
  )
}

const App = (props) => {
  const [board, setBoard] = useState(() => {
    return getRandomBoard();
  });
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [numGames, setNumGames] = useState(0);
  const [message, setMessage] = useState(null);

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

  return (
    <div className="App">
      <div className="left">
        <div className="controls">
          <div><button onClick={(e) => {
            const newBoard = getRandomBoard();
            setScore(0);
            const totalGames = numGames + 1;
            setNumGames(totalGames);
            setAvgScore(totalScore/totalGames);
            setBoard(newBoard);
          }}>Start Over</button></div>
          <div><button>Buy Safe Move</button> -50pts</div>
          <div>Score: {score}</div>
          {message && (<div>{message}</div>)}
        </div>
      </div>
      { renderBoard(board, setBoard, updateScores, updateMessage) }
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
