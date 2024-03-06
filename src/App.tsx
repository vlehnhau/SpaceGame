import * as React from 'react'
import { compileShaderProgram, resizeCanvas, normalMatrix } from './Utility';

import PlanetVertexShaderRaw from "./shader/Planet.vs.glsl?raw"
import PlanetFragmentShaderRaw from "./shader/Planet.fs.glsl?raw"
import { Matrix4, Vector2, Vector3 } from '@math.gl/core';

type AppContext = {
    gl: WebGL2RenderingContext;
    planetShader: WebGLProgram;
    quadVAO: WebGLBuffer;
    aspectRatio: number;

    keyPressedMap: Record<string, boolean>;
    mousePos: Vector2;
    mousePressed: boolean;

    zoom: number;

    cameraPos: Vector3;
    cameraViewDirection: Vector3;
    cameraPitch: number;
    cameraYaw: number;
    cameraSpeed: number;
}

const drawScene = (context: AppContext) => {
    const gl = context.gl;

    executeMovement(context);

    let rotationMat = normalMatrix(new Matrix4().lookAt({
        eye: context.cameraPos,
        center: new Vector3().addVectors(context.cameraPos, context.cameraViewDirection),
        up: new Vector3(0, 1, 0)
    }));

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
    gl.uniform3fv(eyeWorldPosLocation, context.cameraPos);
    
    gl.bindVertexArray(context.quadVAO);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

const executeMovement = (context: AppContext) => {
    const xyDir = new Vector3(-Math.cos(context.cameraYaw), 0, Math.sin(context.cameraYaw));

    if (context.keyPressedMap['w']) {            
        context.cameraPos.addScaledVector(xyDir, context.cameraSpeed);
    }
    else if (context.keyPressedMap['s']) {
        context.cameraPos.addScaledVector(xyDir, -context.cameraSpeed);
    }

    if (context.keyPressedMap['a']) {
        const rightVec = new Vector3(0, 1, 0).cross(xyDir);
        context.cameraPos.addScaledVector(rightVec, context.cameraSpeed);
    }
    else if (context.keyPressedMap['d']) {
        const rightVec = new Vector3(0, 1, 0).cross(xyDir);
        context.cameraPos.addScaledVector(rightVec, -context.cameraSpeed);
    }

    if (context.keyPressedMap['Shift']) {
        context.cameraPos.y -= context.cameraSpeed;
    }
    else if (context.keyPressedMap[' ']) {
        context.cameraPos.y += context.cameraSpeed;
    }
}

const createQuadVAO = (gl: WebGL2RenderingContext) => {
    const quadVertexPositions = [-1, -1, -1,
                                 -1,  1, -1,
                                  1,  1, -1,
                                  1, -1, -1]

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

            keyPressedMap: {},
            mousePos: null,
            mousePressed: false,

            zoom: 1.0,

            cameraPos: new Vector3(2, 0, 0),
            cameraViewDirection: new Vector3(1, 0, 0),
            cameraPitch: 0,
            cameraYaw: 0,
            cameraSpeed: 0.07
        }

        resizeCanvas(canvas.current);
        resizeViewport();

        setInterval(() => { 
            drawScene(contextRef.current);
        }, 10);

        canvas.current.addEventListener('wheel', mouseWheel);
        canvas.current.addEventListener('mousedown', mouseDown);
        canvas.current.addEventListener('mouseup', mouseUp);
        canvas.current.addEventListener('mousemove', mouseMove);
        window.addEventListener('keydown', keyDown);
        window.addEventListener('keyup', keyUp);

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
    
    const mouseMove = (event: MouseEvent): void => {
        if (!contextRef.current) 
            return;
        const ctx = contextRef.current;

        if (ctx.mousePressed) {
            const newPos = new Vector2(event.clientX, event.clientY);

            ctx.cameraYaw   -= ((newPos.x - ctx.mousePos.x) * 0.11) * Math.PI / 180;
            // ctx.cameraPitch -= ((newPos.y - ctx.mousePos.y) * 0.11) * Math.PI / 180;

            ctx.cameraViewDirection.x = Math.cos(ctx.cameraPitch) * Math.cos(ctx.cameraYaw);
            ctx.cameraViewDirection.y = Math.sin(ctx.cameraPitch);
            ctx.cameraViewDirection.z = Math.cos(ctx.cameraPitch) * Math.sin(ctx.cameraYaw);
            ctx.cameraViewDirection.normalize();


            const xyDir = new Vector3(-Math.cos(ctx.cameraYaw), 0, Math.sin(ctx.cameraYaw));

            ctx.cameraPos = xyDir.scale(-2);
            
            ctx.mousePos = newPos;
        }
    }

    const keyDown = (event: KeyboardEvent): void => {
        contextRef.current.keyPressedMap[event.key] = true;
    }

    const keyUp = (event: KeyboardEvent): void => {
        contextRef.current.keyPressedMap[event.key] = false;
    }

    React.useEffect(() => {
        init();
    }, [])

    return (
        <div className='relative bg-white h-screen w-full'>
            <canvas ref={canvas} className='w-full h-screen' onKeyDown={(e) => console.log("Hehe")}></canvas>
        </div>
    )
}

export default App;