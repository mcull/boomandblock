import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState } from 'react';
import { Button, Container, Col, Row, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import useSound from 'use-sound';
import bounce from './sounds/bounce.mp3';
import relief from './sounds/relief.mp3';
import boom from './sounds/boom.mp3';
import victory from './sounds/crunch.mp3';
import ogre from './sounds/ogre.mp3';
import demon from './sounds/demon.mp3';
import dragon from './sounds/dragon.mp3';
import fail from './sounds/fail2.mp3';
import './App.css';
import converter from 'number-to-words';

// -------------- CONSTANTS -----------------
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
/*
 const shuffle = (array) => {
   array.sort(() => Math.random() - 0.5);
   return array;
 }
*/

 const leftPad = (str, char, desiredLen) => {
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
    if (candidate.state === from) {
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

const reterraform = (board, handleBunnyDeath, messageBufferer, monsterSounds) => {
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
    const monsterData = monsterMap[monsterName];
    if (monsterData.status === 'inTimeOut') {
      monsterData.status = null;
      return;
    }
    const currentDistance = distanceToBunny(monster, lastMove);
    const monsterNeighbors = Object.values(getNeighbors(monster, board));
    const bunny = monsterNeighbors.filter(n => n.state === 'lastMove');
    if (bunny.length > 0) {
      const bunnySquare = bunny[0];
      board[bunnySquare.row][bunnySquare.col].state = monsterName;
      board[monster.row][monster.col].state = 'blocked'

      messageBufferer("Blown up by monster");
      handleBunnyDeath();
      return board;
    }
    const openSquares = monsterNeighbors.filter(n => n.state === 'open');
    let closest = currentDistance;
    let candidateMove = null;
    openSquares.forEach(o => {
      const distanceFromNeighbor = distanceToBunny(o, lastMove);
      if (distanceFromNeighbor < closest) {
        candidateMove = o;
        closest = distanceFromNeighbor;
      }
    });

    if (closest <= warningMessages.length) {
      monsterSounds[monster.state]();
      console.log(monsterSounds);
      console.log(monsterName);
      warnings.push(warningMessages[closest-1]);
    }

    if (candidateMove) {
      candidateMove.state = monster.state;
      monster.state = 'blocked';
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
  while (!(pos[0] === bunnySquare.row && pos[1] === bunnySquare.col)) {
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
  const below = Math.min(boardSize-1,row+distance);
  const left = Math.max(0,col-distance);
  const right = Math.min(boardSize-1,col+distance);
  for (let i = above; i <= below; i++) {
    for (let j = left; j <= right; j++) {
      if (i === row && j === col) {
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
const renderBombStats = (numSkulls, numActualBooms, gameIsActive) => {
  if (numSkulls > 0 && gameIsActive) {
    const percentBoom = Number.parseFloat(numActualBooms/numSkulls).toFixed(2);
    return (<div className="bombReport"><span role="img" aria-label="bomb">💣</span>{numActualBooms} <span role="img" aria-label="skull">☠️</span>{numSkulls} = <span role="img" aria-label="grimmace">😬</span><span role="img" aria-label="cross-fingers">🤞</span>{Math.floor(percentBoom*100)}%</div>)
  } else {
    return (<div>&nbsp;</div>)
  }
}

const renderBoard = (board, isValid, handleValidBounce, gameIsActive) => {
  return (
      <div className={`board ${gameIsActive ? 'active' : 'gameOver'}`}>
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

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const renderMessages = (messages, moveNum, gameIsActive, handleStartOver) => {
  if (moveNum === 0) {
    return null;
  }
  if (!messages || messages.length === 0) {
    return null;
  }
  return (
    <ul className="messageList">
    {capitalizeFirstLetter(converter.toWordsOrdinal(moveNum))} move.
    { [].concat(messages).map((m) => (
      <li className='message fadeOut'>{m}</li>
    ))
    }
    {!gameIsActive && (
      <div className="startOver" onClick={ handleStartOver }>Play Again!</div>
    )}
    </ul>
  );
}

// --- STATE MGMT & LUDICROUS CALLBACKS  ---

const App = (props) => {
  const [modal, setModal] = useState(false);
  const [gameIsActive, setGameIsActive] = useState(true);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [maxScore, setMaxScore] = useStickyState(0, "maxScore")
  const [avgScore, setAvgScore] = useStickyState(0, "avgScore");
  const [numGames, setNumGames] = useState(0);
  const [messages, setMessages] = useState([]);
  const [lastMove, setLastMove] = useState([0,0]);
  const [counter, setCounter] = useState(0)
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
  const [playRelief] = useSound(relief, basicSoundControls);
  const [playBoom] = useSound(boom,basicSoundControls);
  const [playVictory] = useSound(victory, basicSoundControls);
  const [playDemon] = useSound(demon, basicSoundControls);
  const [playDragon] = useSound(dragon, basicSoundControls);
  const [playOgre] = useSound(ogre, basicSoundControls);
  const [playFail] = useSound(fail, basicSoundControls);

  const toggle = () => setModal(!modal);

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
    setCounter(counter+1);
    let messageBuffer = [];
    const messageBufferer = (msg) => { messageBuffer = messageBuffer.concat(msg); }
    // always bounce and get the reward
    playBounce();
    setPlaybackRateBounce(playbackRateBounce + 0.01);

    updateLastMoveToBeenThere();

    let bounceScore = defaultReward + square.reward;
    messageBufferer(`+${defaultReward} points for the bounce.`);
    if (square.reward) {
         messageBufferer(`+${square.reward} points for reaching corner square.`);
    }

    switch(square.state) {
      case 'potentialBoom':
        playRelief();
        messageBufferer("Phew! No bomb.");
        handleSuccessfulMove(square, messageBufferer);
        break;
      case 'actualBoom':
        playBoom();
        messageBufferer("Blown up by bomb. GAME OVER");
        square.state = 'detonated';
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
    setBoard(reterraform(board, handleBunnyDeath, messageBufferer, {monster: playDemon, monster2: playDragon, monster3: playOgre}));
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
      messageBufferer(victoryMsg);

      //send monster home
      const monster = square.state
      const monsterData = monsterMap[square.state];
      if (lastMove[0] !== monsterData.homeRow && lastMove[1] !== monsterData.homeCol) {
        const monsterData = monsterMap[monster];
        board[monsterData.homeRow][monsterData.homeCol].state = square.state;
        monsterData['status'] = 'inTimeOut';
      } else{
        // goodbye forever, monster
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
    setMessages(newMsg);
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
    if (square.state === 'safeHaven')  return true;
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
    setCounter(0);
  }

  const handleBuyHop = (hops, price) => {
    const b = board; // necesarry to make React feel like it has a new obj
    updateMessage(`-${price} points to hop to safety.`);
    updateScores(0-price);

    //tag safe havens
    const square = b[lastMove[0]][lastMove[1]];

    const distanceAway = hops;
    const wholeNeighborhood = getNeighbors(square,board,distanceAway);
    const innerNeighborhood =  getNeighbors(square,board,distanceAway-1);

    Object.values(innerNeighborhood).forEach((n) => {
      delete wholeNeighborhood[[n.row,n.col]]
    });
    Object.values(wholeNeighborhood).forEach(n => {
      if (n.state !== 'beenThere' && !n.state.startsWith('monster')) {
        n.state = 'safeHaven';
      }
    });
    setBoard(b);
  }

  const inventory = getInventory(board);
  const potentialBoom = inventory['potentialBoom'] || 0;
  const numActualBooms = inventory['actualBoom'] || 0;
  const numSkulls = potentialBoom + numActualBooms;
  return (
    <>
      <Modal isOpen={modal} toggle={toggle} className="instructions">
        <ModalHeader toggle={toggle}>INSTRUCTIONS</ModalHeader>
        <ModalBody>
        <div className="instructions">
          <p>Hop around on the <span className="green">green</span> squares.</p>
          <p>Avoid the monsters.  They're coming after you!</p>
          <p>Or eat them. <span role="img" aria-label="popcorn">🍿</span></p>
          <p>+50 points when you battle a monster and win.</p>
          <p>You can also hop on <span role="img" aria-label="skull">☠️ </span>squares.  You may have to.</p>
          <p>Some of them have <span role="img" aria-label="bomb">💣</span> under them, but some are safe.</p>
          <p>Good luck!</p>
        </div>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={toggle}>Let's play!</Button>{' '}
        </ModalFooter>
      </Modal>
    <Container fluid={true}>
      <Row>
        <Col xs="9">
          <div class="title"><b><span role="img" aria-label="boom">💥</span>Boom or Blocked</b> <div className="info" onClick={toggle}>&#9432;</div></div>
        </Col>
        <Col xs="3">
        <div className={`score ${score < 0 ? 'red' : ''}`}>{score >= 0 ? leftPad(score.toString(), '0',4) : score}</div>
        </Col>
      </Row>
      <Row className="statsRow">
        <Col xs="6">
          { renderBombStats(numSkulls, numActualBooms, gameIsActive) }
        </Col>
        <Col xs="6" className="scoreStats">
          <span class="resetStats" onClick={resetStats}>&#9851;</span> Top {maxScore} Avg {Math.round(avgScore,2)}
        </Col>
      </Row>
      <Row>
        <Col sm="12"  md="8" lg="6">
          { renderBoard(board, isValid, handleValidBounce, gameIsActive) }
        </Col>
        <Col sm="12" md="4" lg="6">
          <Container>
            <Row>
              <Col xs="5" sm="12" lg="5">
                <div className="statsBox">
                  <div className="salesPitch">Buy a safe hop?</div>
                  <div className="smallPrint">Hop safely to one or two squares away.</div>
                  <div className="safeHavenButtons">
                    <div className="safeHavenPurchase">
                      <button onClick={()=>handleBuyHop(1,50)}><span role="img" aria-label="bunny">🐇</span></button>
                      <div class="pointPrice">-50pts</div>
                    </div>
                    <div class="safeHavenPurchase">
                      <button onClick={()=>handleBuyHop(2,75)}><span role="img" aria-label="bunny">🐇</span><span role="img" aria-label="bunny">🐇</span></button>
                      <div class="pointPrice">-75pts</div>
                    </div>
                  </div>
                </div>
              </Col>
              <Col xs="7" sm="12" lg="7">
                { renderMessages(messages, counter, gameIsActive, handleStartOver) }
              </Col>
            </Row>
          </Container>
        </Col>
      </Row>
      <Row className="footer">
        <Col>Copyright 	&copy; 2020 Richard Wiener &amp; sons</Col>
      </Row>
    </Container>
      </>
  );
}

export default App;
