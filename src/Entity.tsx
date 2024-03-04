import { Vector3 } from "@math.gl/core";
import * as comp from "./Components";

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

    constructor() {
        
    }
}