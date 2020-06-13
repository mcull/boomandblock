import React, { useState, useEffect } from 'react';
import useSound from 'use-sound';
import ls from 'local-storage'
import bounce from './sounds/bounce.mp3';
import relief from './sounds/relief.mp3';
import boom from './sounds/boom.mp3';
import victory from './sounds/crunch.mp3';
import ogre from './sounds/ogre.mp3';
import demon from './sounds/demon.mp3';
import dragon from './sounds/dragon.mp3';
import fail from './sounds/fail2.mp3';
import './App.css';

// -------------- CONSTANTS -----------------

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
                        homeRow: boardSize-1,
                        homeCol: boardSize-1
                      },
                     monster2:
                       { icon: '👺',
                         homeRow: boardSize-1,
                         homeCol: 0 },
                     monster3:
                       { icon: '👹',
                         homeRow: 0,
                         homeCol: boardSize-1
                       }
                    }

const bonusPoints = (function() {
               const x = [];
               const max = boardSize - 1;
               x[0] = [];
               x[max] = [];
               x[max][max] = 250;
               x[0][max] = 150;
               x[max][0] = 150;
               return x;
           })();

// -------------- UTILS ---------------
 const shuffle = (array) => {
   array.sort(() => Math.random() - 0.5);
   return array;
 }

const random = (min, max) =>
   Math.floor(Math.random() * (max - min)) + min;

const sprinkleLiberally = (board, num, from, to) => {
  while (num > 0) {
    const row = random(0,boardSize);
    const col = random(0,boardSize);
    const candidate = board[row][col]
    if (candidate.state == from) {
        candidate.state = to;
        num--;
    }
  }
}

function useStickyState(defaultValue, key) {
  const [value, setValue] = React.useState(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null
      ? JSON.parse(stickyValue)
      : defaultValue;
  });
  React.useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

// -------------- BOARD LOGIC ---------------

const reterraform = (board, handleBunnyDeath, messageBufferer) => {
  let numberBeenThere = 0;
  let lastMove = null;
  const monsters = [];
  board.forEach((row) => {
    row.forEach((square) => {
      if (['blocked','potentialBoom','actualBoom'].includes(square.state)) {
        square.state = 'open';
      } else if (square.state === 'beenThere') {
        numberBeenThere++;
      } else if (square.state === 'lastMove') {
        lastMove = square;
      } else if (square.state.startsWith('monster')) {
        monsters.push(square);
      }
    });
  });

  let block = (boardSize*boardSize - numberBeenThere) / 2;
  sprinkleLiberally(board, block, 'open', 'blocked');

  let potentialBoom = (boardSize*boardSize - numberBeenThere) / 6;
  for (let i = 0; i < potentialBoom; i++) {
    let boom = 'potentialBoom';
    if (random(0,1000) <= 200) {
      boom = 'actualBoom';
    }
    sprinkleLiberally(board, 1, 'open', boom);
  }

  const warningMessages = ["BEWARE! Monster nearby - 80% chance of winning battle with monster.",
                           "BEWARE! Monster two squares away!"];
  const warnings = [];
  monsters.forEach(monster => {
    const monsterName = monster.state
    const currentDistance = distanceToBunny(monster, lastMove);
    const monsterNeighbors = getNeighbors(monster, board);
    const bunny = monsterNeighbors.filter(n => n.state == 'lastMove');
    if (bunny.length > 0) {
      const bunnySquare = bunny[0];
      board[bunnySquare.row][bunnySquare.col].state = monsterName;
      board[monster.row][monster.col].state = 'blocked'


      messageBufferer("Blown up by monster");
      handleBunnyDeath();
      return board;
    }
    const openSquares = monsterNeighbors.filter(n => n.state == 'open');
    let closest = currentDistance;
    let candidateMove = null;
    openSquares.forEach(o => {
      const distanceFromNeighbor = distanceToBunny(o, lastMove);
      if (distanceFromNeighbor < closest) {
        candidateMove = o;
        closest = distanceFromNeighbor;
      }
    });

    if (candidateMove) {
      candidateMove.state = monster.state;
      monster.state = 'blocked';
    }

    if (closest <= warningMessages.length) {
      warnings.push(warningMessages[closest-1]);
    }
  });
  messageBufferer(warnings);
  return board;
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
    }
  }
  let [row,col] = firstMove;
  board[row][col].state = 'lastMove';

  const monsters = Object.keys(monsterMap);
  monsters.forEach((key) => {
    const monster = monsterMap[key];
    board[monster.homeRow][monster.homeCol].state = key;
  })

  return board;
}

const distanceToBunny = (square, bunnySquare) => {
  let distance = 0;
  let pos = [square.row, square.col];
  const bunny = [bunnySquare.row, bunnySquare.col];
  let counter = 0;
  while (!(pos[0] == bunnySquare.row && pos[1] == bunnySquare.col)) {
    [0,1].forEach((direction) => {
      const distanceAway = bunny[direction] - pos[direction];
      pos[direction] = pos[direction] + distanceAway/Math.max(1,Math.abs(distanceAway));
    })
    distance++;
  }
  return distance;
}

const getNeighbors = (square, board) => {
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

const getInventory = (board) => {
  const inventory = {};
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const square = board[row][col];
      if (inventory[square.state]) {
        inventory[square.state] += 1;
      } else {
        inventory[square.state] = 1;
      }
    }
  }
  return inventory;
}

// -------------- PAGE ELEMENTS ---------------

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

// --- STATE MGMT & LUDICROUS CALLBACKS  ---

const App = (props) => {
  const [gameIsActive, setGameIsActive] = useState(true);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [maxScore, setMaxScore] = useStickyState(0, "maxScore")
  const [avgScore, setAvgScore] = useStickyState(0, "avgScore");
  const [numGames, setNumGames] = useState(0);
  const [messages, setMessages] = useState([]);
  const [lastMove, setLastMove] = useState([0,0]);
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

  const isBoxedIn = (square) => {
    const neighbors = getNeighbors(square, board);
    let isBoxedIn = true;
    neighbors.forEach((neighbor, i) => {
      if (!isBoxedIn) {
        return;
      }
      isBoxedIn = ['blocked','beenThere','lastMove'].includes(neighbor.state);
    });
    return isBoxedIn;
  }

  const updateLastMoveToBeenThere = () => {
    const [row,col] = lastMove;
    board[row][col].state = 'beenThere';
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
        updateLastMoveToBeenThere();
        //setBoard(board);
        updateMessage("Blown up by bomb. GAME OVER");
        setGameIsActive(false);
        break;
      case 'open':
        let msg = "+10 points for reaching a safe square."
        let points = 10;
        if (bonus) {
          points = bonus;
          msg = bonusMessage;
        }
        handleSuccessfulMove(square, points, msg);
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
    const msg = message || `${square.row}x${square.col}: ${square.state}`;
    let messageBuffer = [msg];

    updateScores(points || 10);

    updateLastMoveToBeenThere();
    square.state = 'lastMove';

    setLastMove([square.row,square.col]);
    playBounce();
    setPlaybackRateBounce(playbackRateBounce + 0.01);


    setBoard(reterraform(board, handleBunnyDeath, (msg) => { messageBuffer = messageBuffer.concat(msg); }));
    if (gameIsActive && isBoxedIn(square)) {
      messageBuffer.push("No legal squares to move to.  BLOCKED!  Game over.");
      setGameIsActive(false);
    }
    updateMessage(messageBuffer);
  }

  const handleBunnyDeath = () => {
    setGameIsActive(false);
    playFail();

  }

  const handleMonster = (square) => {
    if (random(0,1000) >= 200) {
      playVictory();
      const msgs = [`Won the battle against ${monsterMap[square.state].icon} and gained 50 points for killing monster.`];
      let points = 50;
      const [bonusPoints, bonusMessage] = scoreBonus(square);
      if (bonusPoints) {
        points += bonusPoints
        msgs.push(bonusMessage);
      }
      //send monster home
      const monster = square.state
      if (lastMove[0] != monsterMap[square.state].homeRow) {
        const monsterData = monsterMap[monster];
        board[monsterData.homeRow][monsterData.homeCol].state = square.state;
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
      updateLastMoveToBeenThere();
    }
  }

  const updateScores = (points) => {
    const newScore = score + points;
    setScore(newScore);
    setMaxScore(Math.max(maxScore,newScore));
    setTotalScore(totalScore+points)
  }

  const updateMessage = (newMsg) => {
    console.log( `updating message? ${newMsg}`);
    console.log(messages);
    console.log(messages.concat(newMsg));
    setMessages(messages.concat(newMsg));
  }

  const resetStats = () => {
    setMaxScore(0);
    setTotalScore(0);
    setAvgScore(0);
    setNumGames(0);
  }

  const isValid = (square) => {
    const row = square.row;
    const col = square.col;
    return gameIsActive && !['blocked','beenThere','lastMove'].includes(square.state) &&
           [row-1,row,row+1].includes(lastMove[0]) &&
           [col-1,col,col+1].includes(lastMove[1]);
  }

  const handleStartOver = () => {
    const firstMove = [0,0];
    setLastMove(firstMove);
    setBoard(init(firstMove));
    setScore(0);
    setMessages([]);
    setGameIsActive(true);
    const totalGames = numGames + 1;
    setNumGames(totalGames);
    setAvgScore(totalScore/totalGames);
  }

  const inventory = getInventory(board);
  const potentialBoom = inventory['potentialBoom'] || 0;
  const numActualBooms = inventory['actualBoom'] || 0;
  const numSkulls = potentialBoom + numActualBooms;
  let percentBoom = 0;
  if (numSkulls > 0) {
    percentBoom = Number.parseFloat(numActualBooms/numSkulls).toFixed(2);
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
          <div>Num Skulls: {numSkulls}</div>
          <div>Num Bombs: {numActualBooms}</div>
          <div>Possibilty of Bomb: {Math.floor(percentBoom*100)}%</div>
          <div>Best Score: {maxScore}</div>
          <div>Average Score: {Math.round(avgScore,2)}</div>
          <div><button onClick={resetStats}>Reset stats</button></div>
        </div>
      </div>
    </div>
  );
}

export default App;
