import React, { useState, useEffect } from 'react';
import CountUp from 'react-countup';
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

const NUMERIC = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
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
const defaultReward  = 10;
const monsterPrize = 50;

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

 const leftPad = (str, char, desiredLen) => {
   console.log(str);
   console.log(char);
   if (str && char) {
     while (str.length < desiredLen) {
       str = char + str;
     }
   }
   return str;
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
      square.safeHaven = false;
      if (['blocked','potentialBoom','actualBoom','safeHaven'].includes(square.state)) {
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



  //move monsters
  monsters.forEach(monster => {
    const monsterName = monster.state
    const currentDistance = distanceToBunny(monster, lastMove);
    const monsterNeighbors = Object.values(getNeighbors(monster, board));
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
      board[i][j] = {state: 'open', row: i, col: j, reward: null, price: 0 };
      const edges = [0,boardSize-1];
      if (edges.includes(i) && edges.includes(j)) {
        board[i][j].reward = bonusPoints[i][j];
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

const getNeighbors = (square, board, squaresAway=1) => {

  const neighbors = {};
  const row = square.row;
  const col = square.col;
  const distance = parseInt(squaresAway);
  const above = Math.max(0,row-distance);
  const below = Math.min(boardSize-distance,row+distance);
  const left = Math.max(0,col-distance);
  const right = Math.min(boardSize-distance,col+distance);
  for (let i = above; i <= below; i++) {
    for (let j = left; j <= right; j++) {
      if (i == row && j == col) {
        continue;
      }
      neighbors[[i,j]] = board[i][j];
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
          const reward = square.reward;
          const key = `cell-${i}x${j}.${new Date()}`;
          const validSpace = isValid(square);
          return (
            <div key={key}
                 className={`cell ${square.state} c${i}-${j} ${validSpace ? 'neighbor' : ''}`}
                 onMouseUp={(e) => {
                   console.log(`trying to move to [${i},${j}].  valid? ${validSpace}`)
                   if (validSpace) {
                     handleValidBounce(square);
                   }
                 }}
            >{reward && <div className="bonusScore">+{reward}</div>}</div>
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
  const [priceOfSafety, setPriceOfSafety] = useState(0);
  const [safeHop, setSafeHop] = useState(false);
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

  const isBoxedIn = (square) => {
    const neighbors = Object.values(getNeighbors(square, board));
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

  const updateSquareToLastMove = (square) => {
    setLastMove([square.row,square.col]);
    square.state = 'lastMove';
  }

  const handleValidBounce =  (square) => {
    console.log(`handling valid bounce to [${square.row},${square.col}]`);
    let messageBuffer = [];
    const messageBufferer = (msg) => { messageBuffer = messageBuffer.concat(msg); }
    // always bounce and get the reward
    playBounce();
    setPlaybackRateBounce(playbackRateBounce + 0.01);
    setSafeHop(false);

    updateLastMoveToBeenThere();

    let bounceScore = defaultReward + square.reward;
    messageBufferer(`+${defaultReward} points for reaching a safe square.`);
    if (square.reward) {
         messageBufferer(`+${square.reward} points for reaching corner square.`);
    }
    let discretionaryBonus = null;

    switch(square.state) {
      case 'potentialBoom':
        playRelief();
        messageBufferer("Phew! No bomb.");
        handleSuccessfulMove(square, messageBufferer);
        break;
      case 'actualBoom':
        playBoom();
        messageBufferer("Blown up by bomb. GAME OVER");
        setGameIsActive(false);
        break;
      case 'safeHaven':
      case 'open':
        handleSuccessfulMove(square, messageBufferer);
        break;
      case 'monster':
      case 'monster2':
      case 'monster3':
        const battleResults = handleMonster(square, messageBufferer);
        bounceScore += battleResults.treasure;
        setGameIsActive(battleResults.bunnyPrevailed);
        break;
      default:
        // code block
    }
    updateMessage(messageBuffer);
    updateScores(bounceScore);
  }

  const handleSuccessfulMove = (square, messageBufferer) => {
    updateSquareToLastMove(square);
    setBoard(reterraform(board, handleBunnyDeath, messageBufferer));
    if (gameIsActive && isBoxedIn(square)) {
      messageBufferer("No legal squares to move to.  BLOCKED!  Game over.");
      handleBunnyDeath();
    }
  }

  const handleBunnyDeath = () => {
    setGameIsActive(false);
    playFail();
  }

  const handleMonster = (square, messageBufferer) => {
    messageBufferer(`In battle with ${monsterMap[square.state].icon}.`);
    const victoryMsg = `Won the battle against ${monsterMap[square.state].icon} and gained ${monsterPrize} points for killing monster.`
    const battleResults = { bunnyPrevailed: true,
                            treasure: monsterPrize}
    if (random(0,1000) >= 200) {
      playVictory();

      //send monster home
      const monster = square.state
      if (lastMove[0] != monsterMap[square.state].homeRow) {
        const monsterData = monsterMap[monster];
        board[monsterData.homeRow][monsterData.homeCol].state = square.state;
      } else{
        board[0][0].state = square.state;
      }
      handleSuccessfulMove(square, messageBufferer);
    } else {
      playFail();
      battleResults.bunnyPrevailed = false;
      battleResults.treasure = 0;
      messageBufferer('Eighty percent chance of winning the battle but lost.');
      messageBufferer('GAME OVER');
    }
    return battleResults;
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

  const isValid = (square) => {
    const row = square.row;
    const col = square.col;
    if (!gameIsActive) return false;
    if (square.state == 'safeHaven')  return true;
    const permittedSquare = !['blocked','beenThere','lastMove'].includes(square.state);

    const isNeighbor = [row-1,row,row+1].includes(lastMove[0]) &&
    [col-1,col,col+1].includes(lastMove[1]);

    return  permittedSquare && isNeighbor;

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
    setPlaybackRateBounce(.95);
  }

  const handleBuyHop = (hops, price) => {
    const b = board; // necesarry to make React feel like it has a new obj
    updateMessage(`-${price} points to hop to safety.`);
    updateScores(0-price);
    setSafeHop(true);

    //tag safe havens
    console.log(`buying a hop of ${hops} distance for lastMove`);
    const square = b[lastMove[0]][lastMove[1]];

    const distanceAway = hops;
    const wholeNeighborhood = getNeighbors(square,board,distanceAway);
    const innerNeighborhood =  getNeighbors(square,board,distanceAway-1);
    const safeHavens = [];
    Object.values(innerNeighborhood).forEach((n) => {
      delete wholeNeighborhood[[n.row,n.col]]
    });
    Object.values(wholeNeighborhood).forEach(n => {
      if (n.state != 'beenThere' && !n.state.startsWith('monster')) {
        n.state = 'safeHaven';
      }
    });
    setBoard(b);
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
          <div class="score">{leftPad(score.toString(), '0',4)}</div>
          {messages && (<div className="messages">Game Log{ messages.map((m,i) => (
              <div className={messages.length - i > 10 ? 'hiddenMessage' : 'message'}>{i+1}. {m}</div>
            ))
          }</div>
        )}
        </div>
      </div>
      { renderBoard(board, isValid, handleValidBounce) }
      <div className="right">
        <div className="controls">
          <div><button onClick={()=>handleStartOver()}>Start Over</button></div>
          <div><button onClick={()=>handleBuyHop(2,50)}>Buy Safe Move</button> -50pts</div>
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
