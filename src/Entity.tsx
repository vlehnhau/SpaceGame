import { Vector3 } from "@math.gl/core";
import * as comp from "./Components";
import { Material, VaoMaterialInfo } from "./ObjLoader";

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export interface Entity {
    components: Array<comp.Component>;
}

export class Player implements Entity {
    components: Array<comp.Component>;
    newPos: Vector3;

    constructor(pos: Vector3, voaMatInfo: Array<VaoMaterialInfo>, vertexPositions: number[]) {
        this.newPos = new Vector3(pos.x, pos.y, pos.z);
        this.components = [new comp.PositionComp(pos), new comp.RenderComp(voaMatInfo), new comp.MaxRadius(vertexPositions), new comp.RotationComp()];
    }

    InitiatePlayerMove(newPos: Vector3) {
        this.newPos = newPos;
        let playerPos = (this.components.find(componentPosition => componentPosition instanceof comp.PositionComp) as comp.PositionComp).pos;

        let lastVel = this.components.find(componentVel => componentVel instanceof comp.VelocityComp)
        if (lastVel) {
            this.components.splice(this.components.indexOf(lastVel), 1);
        }

        let vel = new Vector3().subVectors(newPos, playerPos)
        vel.normalize
        vel = vel.multiplyByScalar(0.01)

        this.components.push(new comp.VelocityComp(vel));
    }
}

export class Asteroid implements Entity {
    components: Array<comp.Component>;

    constructor(pos: Vector3, vaoMatInfo: Array<VaoMaterialInfo>, vertexPositions: number[]) {
        let velVec = new Vector3().subVectors((new Vector3(randomIntFromInterval(-600, 600), randomIntFromInterval(-300, 300), 0)), pos)
        velVec.normalize()
        velVec = velVec.multiplyByScalar(3)

        let rotValX = randomIntFromInterval(-5, 5) / 2000;
        let rotValY = randomIntFromInterval(-5, 5) / 2000;
        let rotValZ = randomIntFromInterval(-5, 5) / 2000;
        this.components = [new comp.PositionComp(pos), new comp.RenderComp(vaoMatInfo), new comp.VelocityComp(velVec), new comp.MaxRadius(vertexPositions), new comp.RotationComp(new Vector3(0), new Vector3(rotValX, rotValY, rotValZ))];
    }
}

export class ExplotionParticle implements Entity {
    components: Array<comp.Component>;

    constructor(pos: Vector3, vaoMatInfo: Array<VaoMaterialInfo>, public lifetime: number = 20) {
        let velVec = new Vector3().subVectors((new Vector3(randomIntFromInterval(-1000, 1000), randomIntFromInterval(-1000, 1000), randomIntFromInterval(-1000, 1000))), pos)
        velVec.normalize()
        velVec = velVec.multiplyByScalar(10)

        let rotValX = randomIntFromInterval(-5, 5) / 2000;
        let rotValY = randomIntFromInterval(-5, 5) / 2000;
        let rotValZ = randomIntFromInterval(-5, 5) / 2000;
        this.components = [new comp.PositionComp(pos), new comp.RenderComp(vaoMatInfo), new comp.VelocityComp(velVec), new comp.RotationComp(new Vector3(0), new Vector3(rotValX, rotValY, rotValZ))];
    }
}

export class Bullet implements Entity {
    components: Array<comp.Component>;

    constructor(pos: Vector3, vaoMatInfo: Array<VaoMaterialInfo>) {
        let velVec = new Vector3(0, 0, -1);
        velVec = velVec.multiplyByScalar(10);
        this.components = [new comp.PositionComp(pos), new comp.RenderComp(vaoMatInfo), new comp.VelocityComp(velVec)];
    }
}