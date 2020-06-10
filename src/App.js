import React, { useState, useEffect } from 'react';
import useSound from 'use-sound';
import bounce from './sounds/bounce.mp3';
import relief from './sounds/relief.mp3';
import boom from './sounds/boom.mp3';
import victory from './sounds/fanfare.mp3';
import ogre from './sounds/ogre.mp3';
import demon from './sounds/demon.mp3';
import dragon from './sounds/dragon.mp3';
import fail from './sounds/fail.mp3';


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

const monsterMap = { monster:
                      { icon: '🐲',
                        homeRow: 20,
                        homwCol: 20
                      },
                     monster2:
                       { icon: '👺',
                         homeRow: 20,
                         homeCol: 0 },
                     monster3:
                       { icon: '👹',
                         homeRow: 0,
                         homeCol: 20
                       }
                    }

const bonusPoints = (function() {
               const x = [];
               const max = boardSize - 1;
               x[0] = [];
               x[max] = [];
               x[0][0] = 250;
               x[max][max] = 250;
               x[0][max] = 150;
               x[max][0] = 150;
               return x;
           })();

const shuffle = (array) => {
  array.sort(() => Math.random() - 0.5);
  return array;
}

function useInterval(callback, delay) {
  const intervalId = React.useRef(null);
  const savedCallback = React.useRef(callback);
  React.useEffect(() => {
    savedCallback.current = callback;
  });
  React.useEffect(() => {
    const tick = () => savedCallback.current();
    if (typeof delay === 'number') {
      intervalId.current = window.setInterval(tick, delay);
      return () => window.clearInterval(intervalId.current);
    }
  }, [delay]);
  return intervalId.current;
};

const random = (min, max) =>
  Math.floor(Math.random() * (max - min)) + min;

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
      board[i][j] = {state: 'open', row: i, col: j };
      const edges = [0,boardSize-1];
      if (edges.includes(i) && edges.includes(j)) {
        board[i][j]['score'] = bonusPoints[i][j];
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

const renderBoard = (board, isValid, handleValidBounce) => {
  return (
    <div className="board">
    { board.map((row, i) => {
        return row.map((square, j) => {
          const type = square.state;
          const score = square.score;
          const key = "cell-" + i + "x" + j;
          const validSpace = isValid(square);
          return (
            <div key={key}
                 className={`cell ${type} c${i}-${j} ${validSpace ? 'neighbor' : ''}`}
                 onClick={(e) => {
                   if (validSpace) {
                     handleValidBounce(square);
                   }
                 }}
            >{score && <div className="bonusScore">+{score}</div>}</div>
          )
        })
      })
    }
    </div>
  )
}

const App = (props) => {
  const [gameIsActive, setGameIsActive] = useState(true);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [numGames, setNumGames] = useState(0);
  const [messages, setMessages] = useState([]);
  const [lastMove, setLastMove] = useState(() => getRandomCell());
  const [board, setBoard] = useState(() => {
    return init(lastMove);
  });
  const [playbackRateBounce, setPlaybackRateBounce] = React.useState(0.95);
  const basicSoundControls = { interrupt:true, volume: .25 };
  const [playBounce] = useSound(
    bounce,
    { playbackRate: playbackRateBounce,
      interrupt: true,
      volume: .10
    }
  );
  const [playRelief, exposedReliefData] = useSound(relief, basicSoundControls);
  const [playBoom, exposedBoomData] = useSound(boom,basicSoundControls);
  const [playVictory, exposedVictoryData] = useSound(victory, basicSoundControls);
  const [playDemon, exposedDemonData] = useSound(demon, basicSoundControls);
  const [playDragon, exposedDragonData] = useSound(dragon, basicSoundControls);
  const [playOgre, exposedOgreData] = useSound(ogre, basicSoundControls);
  const [playFail] = useSound(fail, basicSoundControls);

  const scoreBonus = (square) => {
    const tuple = [];
    const points = square.score;
    tuple[0] = points;
    if (points) {
      tuple[1] = `+${points} points for reaching corner square`;
    }
    return tuple;
  }

  const getNeighbors = (square) => {
    const neighbors = [];
    const row = square.row;
    const col = square.col;
    const above = Math.max(0,row-1);
    const below = Math.min(boardSize-1,row+1);
    const left = Math.max(0,col-1);
    const right = Math.min(boardSize-1,col+1);
    for (let i = above; i <= below; i++) {
      for (let j = left; j <= right; j++) {
        if (i == row && j == col) {
          continue;
        }
        neighbors.push(board[i][j]);
      }
    }
    return neighbors;
  }

  const isBoxedIn = (square) => {
    const neighbors = getNeighbors(square);
    console.log(neighbors.map(n=>n.state));
    let isBoxedIn = true;
    neighbors.forEach((neighbor, i) => {
      if (!isBoxedIn) {
        return;
      }
      isBoxedIn = ['blocked','beenThere','lastMove'].includes(neighbor.state);
    });
    return isBoxedIn;
  }

  const handleValidBounce =  (square) => {
    let soundHook = playBounce;
    const [bonus, bonusMessage] = scoreBonus(square);
    switch(square.state) {
      case 'potentialBoom':
        playRelief();
        handleSuccessfulMove(square, bonus, bonusMessage);
        break;
      case 'actualBoom':
        playBoom();
        updateMessage("Blown up by bomb. GAME OVER");
        setGameIsActive(false);
        break;
      case 'open':
        if (isBoxedIn(square)) {
          updateMessage("Boxed in! GAME OVER");
          setGameIsActive(false);
        } else {
          let msg = "+10 points for reaching a safe square."
          let points = 10;
          if (bonus) {
            points = bonus;
            msg = bonusMessage;
          }
          handleSuccessfulMove(square, points, msg);
        }
        break;
      case 'monster':
        handleMonster(square);
        break;
      case 'monster2':
        handleMonster(square);
        break;
      case 'monster3':
        handleMonster(square);
        break;
      default:
        // code block
    }
  }

  const handleSuccessfulMove = (square, points, message) => {
    const newBoard = update(board, square.row, square.col);
    const msg = message || `${square.row}x${square.col}: ${square.state}`;
    updateMessage(msg);
    updateScores(points || 10);
    updateBoard(newBoard, [square.row,square.col]);
    playBounce();
    setPlaybackRateBounce(playbackRateBounce + 0.01);
  }

  const handleMonster = (square) => {
    if (random(0,1000) >= 900) {
      playVictory();
      const msgs = [`Won the battle against ${monsterMap[square.state]} and gained 50 points for killing monster.`];
      let points = 50;
      const [bonusPoints, bonusMessage] = scoreBonus(square);
      if (bonusPoints) {
        points += bonusPoints
        msgs.push(bonusMessage);
      }
      //send monster home
      if (lastMove[0] != monsterMap[square.state].homeRow) {
        board[monsterMap[square.state].homeRow][monsterMap[square.state].homeCol].state = square.type;
      } else{
        board[0][0].state = square.state;
      }
      handleSuccessfulMove(square, 50, msgs);
    } else {
      playFail();
      updateMessage([`In battle with ${monsterMap[square.state].icon}.`,
                     'Eighty percent chance of winning the battle but lost.',
                     'GAME OVER']);
      setGameIsActive(false);
    }
  }

  const updateScores = (points) => {
    const newScore = score + points;
    setScore(newScore);
    setMaxScore(Math.max(maxScore,newScore));
    setTotalScore(totalScore+points)
  }

  const updateMessage = (newMsg) => {
    setMessages(messages.concat(newMsg));
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

  const isValid = (square) => {
    const row = square.row;
    const col = square.col;
    return gameIsActive && !['blocked','beenThere','lastMove'].includes(square.state) &&
           [row-1,row,row+1].includes(lastMove[0]) &&
           [col-1,col,col+1].includes(lastMove[1]);
  }

  const handleStartOver = () => {
    const firstMove = getRandomCell()
    setLastMove(firstMove);
    setBoard(init(firstMove));
    setScore(0);
    setMessages([]);
    setGameIsActive(true);
    const totalGames = numGames + 1;
    setNumGames(totalGames);
    setAvgScore(totalScore/totalGames);

  }

  return (
    <div className={`App ${gameIsActive ? 'active' : 'gameOver'}`}>
      <div className="left">
        <div className="controls">
          <div>
            <button onClick={()=>handleStartOver()}>Start Over</button>
            </div>
          <div><button>Buy Safe Move</button> -50pts</div>
          <div>Score: {score}</div>
          {messages && (<div>{ messages.map((m,i) => (
              <div className={messages.length - i > 10 ? 'hiddenMessage' : ''}>{i+1}. {m}</div>
            ))
          }</div>
        )}
        </div>
      </div>
      { renderBoard(board, isValid, handleValidBounce) }
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
