import * as elem from "./Game";
import * as React from 'react';

type AppContext = {
    gl: WebGL2RenderingContext;
    keyPressedMap: Record<string, boolean>;

    game: elem.Game;
}

const App = () => {
    const canvas = React.useRef<HTMLCanvasElement>();
    const contextRef = React.useRef<AppContext>();
    let myGame: elem.Game;

    const init = async () => {
        const gl = canvas.current.getContext('webgl2', { antialias: true })
        if (!gl) return;

        myGame = new elem.Game(gl);
        contextRef.current = {
            gl,
            game: myGame,
            keyPressedMap: {}
        }
        resizeCanvas(canvas.current);

        setInterval(() => { contextRef.current.game.draw(contextRef.current.gl) }, 1);
        setInterval(() => { executeMovement() }, 100);
        setInterval(() => { myGame.autoMove() }, 1);
        setInterval(() => { myGame.collisionAsteroid() }, 10);
        setInterval(() => { myGame.changeDif() }, 1000);

        window.addEventListener('resize', () => {
            resizeCanvas(canvas.current)
        });

        window.addEventListener('keydown', keyDown);
        window.addEventListener('keyup', keyUp);
    }

    const executeMovement = () => {
        const ctx = contextRef.current;
        if (!myGame.gameOver) {
            if (ctx.keyPressedMap['w'] || ctx.keyPressedMap['ArrowUp']) {
                myGame.move('up');
            }
            else if (ctx.keyPressedMap['s'] || ctx.keyPressedMap['ArrowDown']) {
                myGame.move('down');
            }

            if (ctx.keyPressedMap['a'] || ctx.keyPressedMap['ArrowLeft']) {
                myGame.move('left');
            }
            else if (ctx.keyPressedMap['d'] || ctx.keyPressedMap['ArrowRight']) {
                myGame.move('right');
            }

            if (ctx.keyPressedMap[' ']) {
                myGame.shoot();
            }
        } else {
            if (ctx.keyPressedMap[' ']) {
                myGame.gameOver = false;
                myGame.difficulty = 5;
                myGame.score = 0;
            }
        }
    }

    const keyUp = (event: KeyboardEvent) => {
        const ctx = contextRef.current;
        if (!ctx) return;

        ctx.keyPressedMap[event.key] = false;
    }

    const keyDown = (event: KeyboardEvent) => {
        const ctx = contextRef.current;
        if (!ctx) return;

        ctx.keyPressedMap[event.key] = true;
    }

    React.useEffect(() => {
        init();
    }, [])

    const resizeCanvas = (canvas: HTMLCanvasElement) => {
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            contextRef.current.gl.viewport(0, 0, canvas.width, canvas.height)
        }
    }

    return (
        <div className='relative bg-black h-screen w-full'>
            <canvas ref={canvas} className='w-full h-screen'></canvas>
        </div>
    )
}

export default App;