import { Matrix4, Vector3 } from "@math.gl/core";

export interface Component {

}

export class PhysicsComp implements Component {
    pos: Vector3;
    vel: Vector3;

    constructor(pos: Vector3, vel: Vector3) {
        this.pos = pos;
        this.vel = vel;
    }

    update(deltaTime: number) {
        this.pos.addScaledVector(this.vel, deltaTime);
    }
}

export class RenderComp implements Component {
    vertexBuffer: Array<number>;
    indexBuffer: Array<number>;

    constructor(vertexBuffer: Array<number>, indexBuffer: Array<number>) {
        this.vertexBuffer = vertexBuffer;
        this.indexBuffer = indexBuffer;
    }

    update(shaderID: number, projMatrix: Matrix4, viewMatrix: Matrix4) {
        
    }
}