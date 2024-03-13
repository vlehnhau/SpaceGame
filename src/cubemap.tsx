import NegativeX from './pic/interstellar.png'
import PositiveX from './pic/interstellar.png'
import NegativeY from './pic/interstellar.png'
import PositiveY from './pic/interstellar.png'
import NegativeZ from './pic/interstellar.png'
import PositiveZ from './pic/interstellar.png'

const CubemapTextures = [
    NegativeX,
    PositiveX,
    NegativeY,
    PositiveY,
    NegativeZ,
    PositiveZ
];

export const createCubemap = async (gl: WebGL2RenderingContext): Promise<WebGLTexture> => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    let imageCt = 0;

    const load = async (url, target, tex: WebGLTexture) => {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
            img.onload = () => {
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
                gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);    
				imageCt++;
                if (imageCt == 6) {
                    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
                    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                }
                resolve();
            }
            img.onerror = function () {
                console.log(url, 'not found.');
                reject();
            }
            img.src = url;
        })
    }

    await load(CubemapTextures[0], gl.TEXTURE_CUBE_MAP_NEGATIVE_X, texture);
    await load(CubemapTextures[1], gl.TEXTURE_CUBE_MAP_POSITIVE_X, texture);
    await load(CubemapTextures[2], gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, texture);
    await load(CubemapTextures[3], gl.TEXTURE_CUBE_MAP_POSITIVE_Y, texture);
    await load(CubemapTextures[4], gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, texture);
    await load(CubemapTextures[5], gl.TEXTURE_CUBE_MAP_POSITIVE_Z, texture);

    return texture;
}