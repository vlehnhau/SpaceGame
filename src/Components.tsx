import { Matrix4, Vector3 } from "@math.gl/core";

export interface Component { }

export class PositionComp implements Component {
    constructor(public pos: Vector3) { }
}

export class VelocityComp implements Component {
    constructor(public vel: Vector3) { }
}

export class RenderComp implements Component {
    constructor(public vao: WebGLBuffer, public countTriangles: number) { }
}