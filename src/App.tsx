import * as elem from "./Game";
import * as React from 'react'

type AppContext = {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;

  game: elem.Game;
}

const App = () => {
  const canvas = React.useRef<HTMLCanvasElement>();
  const context = React.useRef<AppContext>();

  const init = async () => {
    const gl = canvas.current.getContext('webgl2', { antialias: true })
    if (!gl) return;

    let myGame = new elem.Game(gl);
    myGame.draw(gl);
  }

  React.useEffect(() => {
    init(); 
  }, [])

  return (
    <div className="h-[inherit] w-[inherit] relative">
      <canvas className="h-[inherit] w-[inherit] bg-black"/>
    </div>
  )
}

export default App;