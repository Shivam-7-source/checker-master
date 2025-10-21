// script.js — corrected & more robust version
const board = document.getElementById("board");
const turnIndicator = document.getElementById("turnIndicator");
const resetBtn = document.getElementById("resetBtn");
const popup = document.getElementById("winnerPopup");
const winnerText = document.getElementById("winnerText");
const playAgain = document.getElementById("playAgain");

let playerTurn = 1;                   // 1 = bottom player, 2 = top player
let boardState = [];                  // 8x8 grid of null or a piece element
let selectedPiece = null;
let pieces = { 1: [], 2: [] };        // arrays of piece elements per player

// ---- BOARD & PIECES INIT ----
function createBoard() {
  board.innerHTML = "";
  boardState = [];
  for (let r = 0; r < 8; r++) {
    const rowArr = [];
    for (let c = 0; c < 8; c++) {
      const square = document.createElement("div");
      square.className = "square " + ((r + c) % 2 === 0 ? "light" : "dark");
      square.dataset.row = r;
      square.dataset.col = c;
      board.appendChild(square);
      rowArr.push(null);
    }
    boardState.push(rowArr);
  }
}

function placePieces() {
  // clear arrays
  pieces = { 1: [], 2: [] };

  // top 3 rows -> player 2
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 !== 0) addPiece(r, c, 2);
    }
  }
  // bottom 3 rows -> player 1
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 !== 0) addPiece(r, c, 1);
    }
  }
}

function addPiece(row, col, player) {
  const piece = document.createElement("div");
  piece.classList.add("piece", `player${player}-piece`);
  piece.dataset.player = player.toString();
  piece.dataset.row = row.toString();
  piece.dataset.col = col.toString();
  piece.dataset.king = "false";
  // selection handler (delegated to function so it can be re-bound)
  piece.addEventListener("click", pieceClickHandler);
  const square = getTile(row, col);
  square.appendChild(piece);
  boardState[row][col] = piece;
  pieces[player].push(piece);
}

// ---- HELPERS ----
function getTile(r, c) {
  return board.children[r * 8 + c];
}

function getPieceAt(r, c) {
  if (r < 0 || r > 7 || c < 0 || c > 7) return null;
  return boardState[r][c];
}

function setPieceAt(r, c, piece) {
  boardState[r][c] = piece;
  if (piece) {
    piece.dataset.row = r.toString();
    piece.dataset.col = c.toString();
  }
}

// ---- EVENTS & MOVE LOGIC ----
function pieceClickHandler(e) {
  e.stopPropagation();
  const piece = e.currentTarget;
  // only allow selection of pieces for current player
  if (parseInt(piece.dataset.player, 10) !== playerTurn) return;
  selectPiece(piece);
}

function selectPiece(piece) {
  clearHighlights();
  if (selectedPiece) selectedPiece.classList.remove("selected");
  selectedPiece = piece;
  piece.classList.add("selected");

  // compute valid moves (respecting mandatory captures)
  const validMoves = computeValidMovesForPiece(piece);
  // highlight them
  validMoves.forEach(m => {
    const sq = getTile(m.to.r, m.to.c);
    sq.classList.add("highlight");
    // attach click handler to perform the move
    sq.onclick = () => {
      performMove(piece, m);
    };
  });
}

// Compute valid moves for a piece. Returns array of moves: {to:{r,c}, jump:bool, jumped?:{r,c}}
function computeValidMovesForPiece(piece) {
  const r = parseInt(piece.dataset.row, 10);
  const c = parseInt(piece.dataset.col, 10);
  const player = parseInt(piece.dataset.player, 10);
  const king = piece.dataset.king === "true";

  // first, check if any jump exists for current player (global mandatory capture)
  const anyJumpExists = anyJumpForPlayer(player);

  const dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
  const moves = [];

  // For men (non-king) in Japanese/International style men can capture backward,
  // but move only forward (unless king). So movement restrictions apply only to non-jump normal moves.
  for (const [dr, dc] of dirs) {
    // If king: treat similar to normal (no flying kings here). You wanted flying kings earlier but we keep simple jump logic.
    const nr = r + dr;
    const nc = c + dc;
    const jumpR = r + dr*2;
    const jumpC = c + dc*2;

    // check capture possibility
    if (jumpR >= 0 && jumpR < 8 && jumpC >= 0 && jumpC < 8) {
      const mid = getPieceAt(nr, nc);
      const dest = getPieceAt(jumpR, jumpC);
      if (mid && parseInt(mid.dataset.player,10) !== player && !dest) {
        // capture is possible
        moves.push({ to: { r: jumpR, c: jumpC }, jump: true, jumped: { r: nr, c: nc }});
      }
    }

    // regular moves are only allowed when no capture exists anywhere for this player
    if (!anyJumpExists) {
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !getPieceAt(nr, nc)) {
        // non-king pieces cannot move backward normally
        if (!king) {
          if (player === 1 && dr === -1) {
            // player1 moves up (-1): allowed
            moves.push({ to: { r: nr, c: nc }, jump: false });
          } else if (player === 2 && dr === 1) {
            // player2 moves down (+1): allowed
            moves.push({ to: { r: nr, c: nc }, jump: false });
          }
        } else {
          // king move
          moves.push({ to: { r: nr, c: nc }, jump: false });
        }
      }
    }
  }

  return moves;
}

// Check if any jump exists for the specified player (to enforce mandatory captures)
function anyJumpForPlayer(player) {
  for (const p of pieces[player]) {
    // if piece has been removed, parentElement will be null
    if (!p.parentElement) continue;
    const r = parseInt(p.dataset.row,10);
    const c = parseInt(p.dataset.col,10);
    const dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
    for (const [dr,dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      const jr = r + dr*2;
      const jc = c + dc*2;
      if (jr < 0 || jr > 7 || jc < 0 || jc > 7) continue;
      const mid = getPieceAt(nr, nc);
      const dest = getPieceAt(jr, jc);
      if (mid && parseInt(mid.dataset.player,10) !== player && !dest) return true;
    }
  }
  return false;
}

// Perform a move (simple or jump). 'move' is the object returned by computeValidMovesForPiece
function performMove(piece, move) {
  // remove old tile reference
  const oldR = parseInt(piece.dataset.row,10);
  const oldC = parseInt(piece.dataset.col,10);
  setPieceAt(oldR, oldC, null);

  // if jump: remove the jumped piece
  if (move.jump) {
    const jr = move.jumped.r;
    const jc = move.jumped.c;
    const jumpedPiece = getPieceAt(jr, jc);
    if (jumpedPiece) {
      // remove from DOM and boardState
      jumpedPiece.remove();
      setPieceAt(jr, jc, null);
      // jumped piece remains in pieces[] but parentElement is null — checkWinner uses that
    }
  }

  // move the piece DOM into new tile and update boardState
  const newR = move.to.r;
  const newC = move.to.c;
  const destTile = getTile(newR, newC);
  destTile.appendChild(piece);
  setPieceAt(newR, newC, piece);

  // king promotion
  const player = parseInt(piece.dataset.player,10);
  if (player === 1 && newR === 0) {
    piece.dataset.king = "true";
    piece.classList.add("king");
  }
  if (player === 2 && newR === 7) {
    piece.dataset.king = "true";
    piece.classList.add("king");
  }

  // After a jump, check for further jumps by same piece -> allow chain jumps
  if (move.jump) {
    const further = computeValidMovesForPiece(piece).filter(m => m.jump);
    if (further.length > 0) {
      // continue with same player's turn and same piece selected (continuous jump)
      clearHighlights();
      selectPiece(piece);
      return;
    }
  }

  // Switch turn
  clearHighlights();
  selectedPiece = null;
  playerTurn = playerTurn === 1 ? 2 : 1;
  updateTurnUI();
  // check for winner (if a player's pieces are all removed or cannot move)
  checkWinner();
}

// Update UI for whose turn it is (stats card highlight, label)
function updateTurnUI() {
  turnIndicator.textContent = `Player ${playerTurn}'s Turn`;
  document.getElementById("player1").classList.toggle("active", playerTurn === 1);
  document.getElementById("player2").classList.toggle("active", playerTurn === 2);
  // optionally highlight available pieces — add subtle class if you want
}

// Clear highlighted squares / onclick handlers
function clearHighlights() {
  document.querySelectorAll(".square.highlight").forEach(sq => {
    sq.classList.remove("highlight");
    sq.onclick = null;
  });
  if (selectedPiece) selectedPiece.classList.remove("selected");
}

// Check victory condition and show popup without freezing
function checkWinner() {
  const alive1 = pieces[1].filter(p => p.parentElement).length;
  const alive2 = pieces[2].filter(p => p.parentElement).length;

  if (alive1 === 0) {
    showWinner(2);
    return;
  } else if (alive2 === 0) {
    showWinner(1);
    return;
  }

  // also check if current player has ANY legal moves; if not, opponent wins
  const curHasMove = playerHasAnyMove(playerTurn);
  if (!curHasMove) {
    showWinner(playerTurn === 1 ? 2 : 1);
  }
}

function playerHasAnyMove(player) {
  for (const p of pieces[player]) {
    if (!p.parentElement) continue;
    const moves = computeValidMovesForPiece(p);
    if (moves.length > 0) return true;
  }
  return false;
}

function showWinner(player) {
  // animated popup if present (we used popup in HTML). If not present, fallback to alert.
  if (typeof popup !== "undefined" && popup) {
    popup.classList.remove("hidden");
    winnerText.textContent = `🎉 Player ${player} Wins!`;
  } else {
    setTimeout(() => alert(`Player ${player} Wins!`), 50);
  }
}

// Reset / start
function startGame() {
  createBoard();
  placePieces();
  playerTurn = 1;
  selectedPiece = null;
  clearHighlights();
  updateTurnUI();
  if (popup && !popup.classList.contains("hidden")) popup.classList.add("hidden");
}

// play again button (if you have popup element)
if (typeof playAgain !== "undefined" && playAgain) {
  playAgain.addEventListener("click", () => {
    if (popup) popup.classList.add("hidden");
    startGame();
  });
}
resetBtn.addEventListener("click", startGame);

// start
startGame();
