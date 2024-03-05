import * as elem from "./Game";
import * as React from 'react';

type AppContext = {
    gl: WebGL2RenderingContext;

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
            game: myGame
        }
        resizeCanvas(canvas.current);

        setInterval(() => { contextRef.current.game.draw(contextRef.current.gl) }, 1);
       // setInterval(() => { myGame.autoMove() }, 1);

        window.addEventListener('resize', () => {
            resizeCanvas(canvas.current)
        });

        window.addEventListener('keydown', keyDown)
    }

    const keyDown = (event: KeyboardEvent) => {
        const ctx = contextRef.current
        if (!ctx) return;

        let lru = false;
        if (event.key === 'ArrowLeft') {
            myGame.move('left');
            lru = true;
        } else if (event.key === 'ArrowRight') {
            myGame.move('right');
            lru = true;
        } else if (event.key === 'ArrowUp') {
            myGame.move('up');
            lru = true;
        } else if (event.key === 'ArrowDown') {
            myGame.move('down');
            lru = true;
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