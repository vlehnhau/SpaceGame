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

        window.addEventListener('resize', () => {
            resizeCanvas(canvas.current)
        });

        window.addEventListener('keydown', keyDown)
    }

    const executeMovement = () => {
        const ctx = contextRef.current;

        if (ctx.keyPressedMap['w']) {            
            myGame.move('up');
        }
        else if (ctx.keyPressedMap['s']) {
            myGame.move('down');
        }
    
        if (ctx.keyPressedMap['a']) {
            myGame.move('left');
        }
        else if (ctx.keyPressedMap['d']) {
            myGame.move('right');
        }
    
        if (ctx.keyPressedMap[' ']) {
            myGame.shoot();
        }

        ctx.keyPressedMap['w'] = false;
        ctx.keyPressedMap['a'] = false;
        ctx.keyPressedMap['s'] = false;
        ctx.keyPressedMap['d'] = false;
        ctx.keyPressedMap[' '] = false;
    }

    const keyDown = (event: KeyboardEvent) => {
        const ctx = contextRef.current;
        if (!ctx) return;

        if (event.key === 'ArrowLeft' ||  event.key === 'a') {
            ctx.keyPressedMap['a'] = true;
        } else if (event.key === 'ArrowRight' ||  event.key === 'd') {
            ctx.keyPressedMap['d'] = true;
        } else if (event.key === 'ArrowUp' ||  event.key === 'w') {
            ctx.keyPressedMap['w'] = true;
        } else if (event.key === 'ArrowDown' ||  event.key === 's') {
            ctx.keyPressedMap['s'] = true;
        } else if (event.key === ' ') {
            ctx.keyPressedMap[' '] = true;
        }
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