import { useRef, useEffect, useCallback, useState } from 'preact/hooks';
import Paper from 'paper';
import style from './style.css';

// https://stackoverflow.com/questions/56197908/how-to-use-paperjs-with-react

const { Size, Point, Raster, Path, Color } = Paper;

const canvasWidth = 550;
const canvasHeight = 320;

const Canvas = _ => {
  const [isPlay, setIsPlay] = useState(false);
  const [isShowResetButton, setIsShowResetButton] = useState(false);

  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(_ => {
    Paper.setup(canvasRef.current);

    const { view, project } = Paper;

    // http://paperjs.org/tutorials/images/using-pixel-colors/

    // The size of our grid cells:
    const gridSize = 10;

    // Space the cells by 120%:
    const spacing = 1.2;

    const rasterSrc = process.env.PUBLIC_PATH + 'assets/images/background.jpg';

    // layer 1
    const layer1Raster = new Raster(rasterSrc);
    layer1Raster.position = view.center;

    layer1Raster.on('load', _ => {
      // set up layer 1
      layer1Raster.size = new Size(canvasWidth, canvasHeight);

      // set layer 1 alpha
      for (let x = 0; x < layer1Raster.width; x++) {
        for (let y = 0; y < layer1Raster.height; y++) {
          const color = layer1Raster.getPixel(x, y);
          const newColor = new Color(color);
          newColor.alpha = 0;
          layer1Raster.setPixel(x, y, newColor);
        }
      }
    });

    // layers 2 and 3
    const layer2And3Raster = new Raster(rasterSrc);
    layer2And3Raster.visible = false;
    const layer2And3Paths = [];

    layer2And3Raster.on('load', _ => {
      // set up layers 2 & 3

      // Since the example image we're using is much too large,
      // and therefore has way too many pixels, lets downsize it to
      layer2And3Raster.size = new Size(
        canvasWidth / gridSize,
        canvasHeight / gridSize
      );

      for (let x = 0; x < layer2And3Raster.width; x++) {
        for (let y = 0; y < layer2And3Raster.height; y++) {
          // Get the color of the pixel:
          const color = layer2And3Raster.getPixel(x, y);

          // set up layer 2

          // Create a circle shaped path:
          const layer2Path = new Path.Circle({
            center: new Point(x * gridSize, y * gridSize),
            radius: gridSize / 2 / spacing
          });

          // Set the fill color of the path to the color
          // of the pixel:
          const layer2Color = new Color(color);
          layer2Color.alpha = 0;
          layer2Path.fillColor = layer2Color;

          // set up layer 3

          // Create a circle shaped path:
          const layer3Path = new Path.Circle({
            center: new Point(x * gridSize, y * gridSize),
            radius: gridSize / 2 / spacing,
            fillColor: 'black'
          });

          // Scale the path by the amount of gray in the pixel color:
          layer3Path.scale(1 - color.gray);

          layer2And3Paths.push({
            layer2: layer2Path,
            layer3: layer3Path,
            currentLayer: 3
          });
        }
      }

      // Move the active layer to the center of the view, so all
      // the created paths in it appear centered.
      project.activeLayer.position = view.center;
    });

    view.onMouseMove = event => {
      const { x, y } = event.point;
      const gridX = Math.floor(x / gridSize);
      const gridY = Math.floor(y / gridSize);

      //console.log(gridX, gridY, gridX * layer2And3Raster.width + gridY);

      const pixelIdx = gridX * layer2And3Raster.width + gridY;

      const layer2And3Path = layer2And3Paths[pixelIdx];

      if (layer2And3Path === undefined) {
        console.log(gridX, gridY);
      } else {
        switch (layer2And3Path.currentLayer) {
          case 3:
            layer2And3Path.layer3.fillColor.alpha = 0;
            layer2And3Path.layer2.fillColor.alpha = 1;
            layer2And3Path.currentLayer = 2;
            break;
          case 2:
            layer2And3Path.layer2.fillColor.alpha = 0;
            layer2And3Path.currentLayer = 1;

            // set layer 1
            const color = layer1Raster.getPixel(x, y);
            const newColor = new Color(color);
            newColor.alpha = 1;
            layer1Raster.setPixel(x, y, newColor);

            break;
        }
      }
    };

    view.draw();
  }, []);

  useEffect(
    _ => {
      if (isPlay) {
        audioRef.current.play();
      }
    },
    [isPlay]
  );

  const handleResetButtonClick = useCallback(_ => {
    setIsPlay(false);
    setIsShowResetButton(false);
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }, []);

  return (
    <div className={style.canvasContainer}>
      <canvas ref={canvasRef} className={style.ecardCanvas} />
      <button
        className={`button reset ${isShowResetButton ? 'show' : 'hide'}`}
        onClick={handleResetButtonClick}
      />
      <audio ref={audioRef} src={''} loop={true} />
    </div>
  );
};

export default Canvas;
