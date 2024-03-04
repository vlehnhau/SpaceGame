import * as elem from "./Game";
import * as React from 'react'

type AppContext = {
  gl: WebGL2RenderingContext;

  game: elem.Game;
}

const App = () => {
  const canvas = React.useRef<HTMLCanvasElement>();
  const contextRef = React.useRef<AppContext>();
  const init = async () => {
    
    const gl = canvas.current.getContext('webgl2', { antialias: true })
    if (!gl) return;
    
    let myGame = new elem.Game(gl);
    contextRef.current = {
      gl,
      game: myGame
    }
    resizeCanvas(canvas.current);
    
    setInterval(() => {contextRef.current.game.draw(contextRef.current.gl)}, 100);

    window.addEventListener('resize', () => {
      resizeCanvas(canvas.current)
      console.log("resized")
    });

  }

  React.useEffect(() => {
    init(); 
  }, [])

  const resizeCanvas = (canvas: HTMLCanvasElement) => {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    console.log(displayHeight)
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        contextRef.current.gl.viewport(0, 0, canvas.width, canvas.height)
    }
  }

  return (
    <div className='relative bg-white h-screen w-full'>
      <canvas ref={canvas} className='w-full h-screen'></canvas>
    </div>
  )
}

export default App;