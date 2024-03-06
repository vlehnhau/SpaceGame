import * as React from 'react'
import { compileShaderProgram, mouseToTrackball, resizeCanvas, trackball } from './Utility';

import PlanetVertexShaderRaw from "./shader/Planet.vs.glsl?raw"
import PlanetFragmentShaderRaw from "./shader/Planet.fs.glsl?raw"
import { Matrix3, Matrix4, Quaternion, Vector2, Vector3, Vector4 } from '@math.gl/core';

type AppContext = {
    gl: WebGL2RenderingContext;
    planetShader: WebGLProgram;
    quadVAO: WebGLBuffer;
    aspectRatio: number;

    mousePos: Vector2;
    mousePressed: boolean;

    zoom: number;
    orientation: Quaternion;
}

const drawScene = (context: AppContext) => {
    const gl = context.gl;

    const eyePos = new Vector3(0, 0, 2).transformByQuaternion(context.orientation);
    
    const rotationMat = new Matrix3().fromQuaternion(context.orientation);
    
    const projectionMatrix = new Matrix4().identity();
    projectionMatrix.setElement(0, 0, 1 / context.aspectRatio);
    projectionMatrix.scale([context.zoom, context.zoom, context.zoom]);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.useProgram(context.planetShader);
    
    const projectionMatrixLocation = gl.getUniformLocation(context.planetShader, "uProjectionMatrix");
    gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);

    gl.uniformMatrix3fv(gl.getUniformLocation(context.planetShader, "uRotationMatrix"), false, rotationMat);

    const eyeWorldPosLocation = gl.getUniformLocation(context.planetShader, "uEyeWorldPos");
    gl.uniform3fv(eyeWorldPosLocation, eyePos);
    
    gl.bindVertexArray(context.quadVAO);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

const createQuadVAO = (gl: WebGL2RenderingContext) => {
    const quadVertexPositions = [-1, -1, 0,
                                 -1,  1, 0,
                                  1,  1, 0,
                                  1, -1, 0]

    const quadIndices = [0, 1, 2, 
                         0, 2, 3]

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVertexPositions), gl.STATIC_DRAW);    
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(quadIndices), gl.STATIC_DRAW);

    return vao;
}

const App = () => {
    const canvas = React.useRef<HTMLCanvasElement>();
    const contextRef = React.useRef<AppContext>();

    const init = async () => {
        const gl = canvas.current.getContext('webgl2', { antialias: true })
        if (!gl) return;

        const planetShader = compileShaderProgram(gl, PlanetVertexShaderRaw, PlanetFragmentShaderRaw);
        const quadVAO = createQuadVAO(gl);

        contextRef.current = {
            gl,
            planetShader,
            quadVAO,
            aspectRatio: 1.0,

            mousePos: null,
            mousePressed: false,
            zoom: 1.0,
            orientation: new Quaternion()
        }

        resizeCanvas(canvas.current);
        resizeViewport();

        setInterval(() => { 
            drawScene(contextRef.current) 
        }, 100);

        canvas.current.addEventListener('wheel', mouseWheel);
        canvas.current.addEventListener('mousedown', mouseDown);
        canvas.current.addEventListener('mouseup', mouseUp);
        canvas.current.addEventListener('mousemove', mouseMove);

        window.addEventListener('resize', () => {
            if (resizeCanvas(canvas.current))
                resizeViewport();
        });
    }

    const resizeViewport = () => {
        contextRef.current.aspectRatio = canvas.current.width / canvas.current.height;
        contextRef.current.gl.viewport(0, 0, canvas.current.width, canvas.current.height)
    }

    const mouseWheel = (event: WheelEvent): void => {
        if (!contextRef.current) 
            return;
        contextRef.current.zoom += event.deltaY * 0.0008;
    }

    const mouseDown = (event: MouseEvent): void => {
        if (!contextRef.current) 
            return;
        const ctx = contextRef.current;
        ctx.mousePressed = true;
        ctx.mousePos = new Vector2(event.clientX, event.clientY);
    }

    const mouseUp = (event: MouseEvent): void => {
        if (!contextRef.current) 
            return;
        const ctx = contextRef.current;
        ctx.mousePressed = false;
    }
    
    const mouseMove = (event: MouseEvent) => {
        if (!contextRef.current) 
            return;
        const ctx = contextRef.current;

        if (ctx.mousePressed) {
            const newPos = new Vector2(event.clientX, event.clientY);

            let p0 = mouseToTrackball(ctx.gl.canvas, ctx.mousePos);
            let p1 = mouseToTrackball(ctx.gl.canvas, newPos);

            ctx.orientation.multiplyLeft(trackball(p1, p0));
            ctx.orientation.normalize();
            
            ctx.mousePos = newPos;
        }
    }

    React.useEffect(() => {
        init();
    }, [])

    return (
        <div className='relative bg-white h-screen w-full'>
            <canvas ref={canvas} className='w-full h-screen'></canvas>
        </div>
    )
}

export default App;