import { Vector3 } from "@math.gl/core";
import * as comp from "./Components";

function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export interface Entity {
    components: Array<comp.Component>;
}

export class Player implements Entity {
    components: Array<comp.Component>;

    constructor(pos: Vector3, vao: WebGLBuffer, triangleCount: number) {
        this.components = [new comp.PositionComp(pos), new comp.RenderComp(vao, triangleCount)];
    }
}

export class Asteroid implements Entity {
    components: Array<comp.Component>;

    constructor(pos: Vector3, vao: WebGLBuffer, triangleCount: number) {
        let velVec = new Vector3().subVectors((new Vector3(randomIntFromInterval(-600,600), randomIntFromInterval(-300,300), 0)), pos)
        velVec.normalize()
        velVec = velVec.multiplyByScalar(3)

        this.components = [new comp.PositionComp(pos), new comp.RenderComp(vao, triangleCount), new comp.Velocity(velVec)];
    }
}

export class Bullet implements Entity {
    components: comp.Component[];

    constructor(pos: Vector3, vao: WebGLBuffer, triangleCount: number) {
        let velVec = new Vector3(0,0,0);
        velVec = velVec.multiplyByScalar(3);
        this.components = [new comp.PositionComp(pos), new comp.RenderComp(vao, triangleCount), new comp.Velocity(velVec)];
    }
}