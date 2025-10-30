const BOARD_SIZE = 20; // 10 -> 20으로 변경
const board = document.getElementById('board');
const statusDisplay = document.getElementById('status');
const restartButton = document.getElementById('restart-button');
let tiles = [];
let isGameOver = false;

// 파이프 종류 정의: {타입: [0도에서의 연결 방향]}
// 방향: N(0), E(90), S(180), W(270)
const PIPE_TYPES = {
    'straight': [0, 180], // N-S
    'corner': [0, 90],   // N-E
    'tee': [0, 90, 180], // N-E-S
    'end': [0],          // N
    'start': [90],       // 서버: E만 출력
    'exit': [270]        // 외부: W만 입력
};

// 모든 파이프 타입을 리스트로 정의
const standardPipes = Object.keys(PIPE_TYPES).filter(t => t !== 'start' && t !== 'exit');

// 회전 각도에 따른 실제 방향을 계산하는 함수
function getRotatedDirections(type, rotation) {
    const baseDirs = PIPE_TYPES[type];
    if (!baseDirs) return [];
    const numRotations = rotation / 90; 
    return baseDirs.map(dir => (dir + numRotations * 90) % 360);
}

// 두 인접 타일이 올바르게 연결되었는지 확인
function isConnected(tile1, tile2) {
    const r1 = tile1.r, c1 = tile1.c;
    const r2 = tile2.r, c2 = tile2.c;
    
    const dir1 = getRotatedDirections(tile1.type, tile1.rotation);
    const dir2 = getRotatedDirections(tile2.type, tile2.rotation);

    let dir1To2 = -1;
    let dir2To1 = -1; 
    
    if (c2 > c1) { // tile2가 동쪽
        dir1To2 = 90;    
        dir2To1 = 270;  
    }
    else if (c2 < c1) { // tile2가 서쪽
        dir1To2 = 270;  
        dir2To1 = 90;   
    }
    else if (r2 > r1) { // tile2가 남쪽
        dir1To2 = 180;  
        dir2To1 = 0;    
    }
    else if (r2 < r1) { // tile2가 북쪽
        dir1To2 = 0;    
        dir2To1 = 180;  
    }

    return dir1To2 !== -1 && dir1.includes(dir1To2) && dir2.includes(dir2To1);
}

// BFS (Breadth-First Search)를 사용하여 연결된 경로 탐색
function checkConnection() {
    document.querySelectorAll('.tile').forEach(el => el.classList.remove('connected'));
    
    // 연결되지 않았을 때 메시지
    statusDisplay.textContent = "tip: 시작점과 끝점을 회전시킬 수 있습니다!";

    const startTile = tiles.find(t => t.type === 'start');
    if (!startTile) return;

    const queue = [startTile];
    const visited = new Set();
    visited.add(`${startTile.r},${startTile.c}`);

    let isWin = false;

    while (queue.length > 0) {
        const current = queue.shift();
        const currentElement = board.children[current.r * BOARD_SIZE + current.c];
        currentElement.classList.add('connected');
        
        if (current.type === 'exit') {
            isWin = true;
            break;
        }

        const neighbors = [
            { r: current.r - 1, c: current.c }, // N
            { r: current.r, c: current.c + 1 }, // E
            { r: current.r + 1, c: current.c }, // S
            { r: current.r, c: current.c - 1 }  // W
        ];

        for (const { r, c } of neighbors) {
            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                const neighborIndex = r * BOARD_SIZE + c;
                const neighborTile = tiles[neighborIndex];
                const key = `${r},${c}`;

                if (!visited.has(key) && isConnected(current, neighborTile)) {
                    visited.add(key);
                    queue.push(neighborTile);
                }
            }
        }
    }

    if (isWin) {
        // 성공 메시지
        statusDisplay.textContent = "🥳 예언자의 방 비밀번호는 218입니다";
        isGameOver = true;
    }
}

// 타일 클릭 이벤트 핸들러
function handleTileClick(event) {
    if (isGameOver) return;
    
    const index = parseInt(event.target.dataset.index);
    const tile = tiles[index];

    tile.rotation = (tile.rotation + 90) % 360;
    event.target.style.transform = `rotate(${tile.rotation}deg)`;

    checkConnection();
}

/**
 * 해결 가능한 보드를 생성하고, 퍼즐을 위해 무작위로 섞습니다.
 */
function generateSolvableBoard() {
    const tempTiles = [];
    const size = BOARD_SIZE;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            tempTiles.push({ r, c, type: 'end', rotation: 0, index: r * size + c });
        }
    }

    const start = tempTiles[0]; 
    const exit = tempTiles[size * size - 1]; 
    start.type = 'start';
    exit.type = 'exit';
    
    let current = start;
    let path = [current];
    const visitedPath = new Set([`${current.r},${current.c}`]);

    // 경로 생성 (DFS 기반)
    while (current !== exit) {
        const r = current.r;
        const c = current.c;
        const possibleNeighbors = [];

        const neighbors = [
            { dr: -1, dc: 0, dir: 0 },   // N (0)
            { dr: 0, dc: 1, dir: 90 },   // E (90)
            { dr: 1, dc: 0, dir: 180 },  // S (180)
            { dr: 0, dc: -1, dir: 270 }  // W (270)
        ];

        for (const { dr, dc, dir } of neighbors) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                const key = `${nr},${nc}`;
                if (!visitedPath.has(key) || (nr === exit.r && nc === exit.c)) {
                    possibleNeighbors.push({ tile: tempTiles[nr * size + nc], dirFromCurrent: dir });
                }
            }
        }

        if (possibleNeighbors.length === 0) {
            path.pop();
            if (path.length === 0) break;
            current = path[path.length - 1];
            continue;
        }

        const nextMove = possibleNeighbors[Math.floor(Math.random() * possibleNeighbors.length)];
        const next = nextMove.tile;
        
        if (current.type !== 'start' && current.type !== 'exit') {
            current.type = 'corner'; 
            current.rotation = 0; 
        }
        
        if (next.type !== 'start' && next.type !== 'exit') {
            next.type = 'corner';
            next.rotation = 0; 
        }

        if (!visitedPath.has(`${next.r},${next.c}`)) {
            visitedPath.add(`${next.r},${next.c}`);
            path.push(next);
        }

        current = next;
    }
    
    // 경로 확정 및 파이프 타입/회전 설정
    for (let i = 0; i < path.length; i++) {
        const tile = path[i];
        
        let requiredDirs = [];
        
        if (i > 0) {
            const prev = path[i - 1];
            if (prev.c < tile.c) requiredDirs.push(270); // W
            else if (prev.c > tile.c) requiredDirs.push(90); // E
            else if (prev.r < tile.r) requiredDirs.push(0); // N
            else if (prev.r > tile.r) requiredDirs.push(180); // S
        }

        if (i < path.length - 1) {
            const next = path[i + 1];
            if (next.c > tile.c) requiredDirs.push(90); // E
            else if (next.c < tile.c) requiredDirs.push(270); // W
            else if (next.r > tile.r) requiredDirs.push(180); // S
            else if (next.r < tile.r) requiredDirs.push(0); // N
        }
        
        requiredDirs = [...new Set(requiredDirs)]; 

        if (tile.type === 'start') {
            if (requiredDirs.length > 0) {
                tile.rotation = (requiredDirs[0] - 90 + 360) % 360; 
            } else {
                tile.rotation = 0; 
            }
            continue;
        }
        if (tile.type === 'exit') {
            if (requiredDirs.length > 0) {
                tile.rotation = (requiredDirs[0] - 270 + 360) % 360; 
            } else {
                tile.rotation = 0; 
            }
            continue;
        }

        if (requiredDirs.length === 1) {
            tile.type = 'end';
            tile.rotation = (requiredDirs[0] + 360) % 360; 
        } else if (requiredDirs.length === 2) {
            if ((requiredDirs.includes(0) && requiredDirs.includes(180)) || (requiredDirs.includes(90) && requiredDirs.includes(270))) {
                tile.type = 'straight';
                tile.rotation = requiredDirs.includes(90) ? 90 : 0; 
            } 
            else { 
                tile.type = 'corner';
                if (requiredDirs.includes(0) && requiredDirs.includes(270)) tile.rotation = 270;
                else if (requiredDirs.includes(270) && requiredDirs.includes(180)) tile.rotation = 180;
                else if (requiredDirs.includes(180) && requiredDirs.includes(90)) tile.rotation = 90;
                else tile.rotation = 0;
            }
        } else if (requiredDirs.length === 3) {
            tile.type = 'tee';
            const blockedDir = [0, 90, 180, 270].find(d => !requiredDirs.includes(d));
            tile.rotation = (270 - blockedDir + 360) % 360; 
        }
    }
    
    // 나머지 빈 타일들을 무작위로 채우기
    for (const tile of tempTiles) {
        if (tile.type !== 'start' && tile.type !== 'exit' && !path.includes(tile)) {
            tile.type = standardPipes[Math.floor(Math.random() * standardPipes.length)];
        }
    }
    
    // 모든 타일을 무작위로 회전시켜 퍼즐 생성
    for (const tile of tempTiles) {
        tile.rotation = Math.floor(Math.random() * 4) * 90; 
    }

    return tempTiles;
}


// 게임 초기화
function initGame() {
    isGameOver = false;
    board.innerHTML = '';
    
    tiles = generateSolvableBoard(); 

    for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i];
        
        // 시작점과 종료점 위치 업데이트
        if (tile.r === 0 && tile.c === 0) {
            tile.type = 'start';
        } else if (tile.r === BOARD_SIZE - 1 && tile.c === BOARD_SIZE - 1) {
            tile.type = 'exit';
        }

        const tileElement = document.createElement('div');
        tileElement.classList.add('tile', `pipe-${tile.type}`);
        
        tileElement.style.transform = `rotate(${tile.rotation}deg)`;
        tileElement.dataset.index = i;

        tileElement.addEventListener('click', handleTileClick);

        board.appendChild(tileElement);
    }
    
    checkConnection();
}

// 이벤트 리스너 설정
restartButton.addEventListener('click', initGame);

// 게임 시작
initGame();
