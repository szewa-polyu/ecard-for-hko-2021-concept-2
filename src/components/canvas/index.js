import { useRef, useEffect, useCallback, useState } from 'preact/hooks';
import Paper from 'paper';
import style from './style.css';

// https://stackoverflow.com/questions/56197908/how-to-use-paperjs-with-react

const { Size, Point, Raster, Path, Color, Tween } = Paper;

const canvasWidth = 550;
const canvasHeight = 320;

const loadRasterAsync = (src, onBeforeLoad = null) =>
  new Promise((resolve, reject) => {
    const raster = new Raster(src);

    if (typeof onBeforeLoad === 'function') {
      onBeforeLoad(raster);
    }

    const handleLoad = _ => {
      resolve(raster);
      raster.off('load', handleLoad);
    };

    raster.on('load', handleLoad);
  });

const Canvas = _ => {
  const [isPlay, setIsPlay] = useState(false);
  const [isShowResetButton, setIsShowResetButton] = useState(false);

  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(async _ => {
    Paper.setup(canvasRef.current);

    const { view, project } = Paper;

    // http://paperjs.org/tutorials/images/using-pixel-colors/

    // The size of our grid cells:
    const gridSize = 10;

    // Space the cells by 120%:
    const spacing = 1.2;

    const numOfGridX = canvasWidth / gridSize;
    const numOfGridY = canvasHeight / gridSize;
    const totalNumOfGrids = numOfGridX * numOfGridY;
    const layer1FadeInCounterThreshold = 0.05 * totalNumOfGrids;

    const layer1FadeInTween1Duration = 2500;
    const layer1FadeInTween2Duration = 2500;

    const rasterSrc = process.env.PUBLIC_PATH + 'assets/images/background.jpg';

    // layer 1
    const layer1Raster = await loadRasterAsync(rasterSrc, raster => {
      raster.position = view.center;
    });

    // set up layer 1
    layer1Raster.size = new Size(canvasWidth, canvasHeight);

    layer1Raster.opacity = 0;

    // layers 2 and 3
    const layer2And3Raster = await loadRasterAsync(rasterSrc, raster => {
      raster.visible = false;
    });

    const layer2And3Paths = [];

    // set up layers 2 & 3

    // Since the example image we're using is much too large,
    // and therefore has way too many pixels, lets downsize it to
    layer2And3Raster.size = new Size(numOfGridX, numOfGridY);

    for (let y = 0; y < layer2And3Raster.height; y++) {
      for (let x = 0; x < layer2And3Raster.width; x++) {
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
          fillColor: new Color(0, 0, 0, 1)
        });

        // Scale the path by the amount of gray in the pixel color:
        layer3Path.scale(1 - color.gray);

        layer2And3Paths.push({
          layer2: layer2Path,
          layer3: layer3Path,
          isFlipped: false
        });
      }
    }

    // Move the active layer to the center of the view, so all
    // the created paths in it appear centered.
    project.activeLayer.position = view.center;

    let isLayer1FadedIn = false;

    const fadeInLayer1 = _ => {
      isLayer1FadedIn = true;
      console.log('fade in!');

      // dummy layer2And3Raster
      const tween1 = layer2And3Raster.tween(
        { myValue: 0 },
        { myValue: 1 },
        {
          duration: layer1FadeInTween1Duration,
          easing: 'easeOutCubic'
        }
      );

      tween1.on('update', ({ factor }) => {
        for (let layer2And3Path of layer2And3Paths) {
          layer2And3Path.layer3.fillColor.alpha = 1 - factor;
          layer2And3Path.layer2.fillColor.alpha = 0.5 + 0.5 * factor;
        }
      });

      tween1.then(_ => {
        // dummy layer2And3Raster
        const tween2 = layer2And3Raster.tween(
          { myValue: 0 },
          { myValue: 1 },
          {
            duration: layer1FadeInTween2Duration,
            easing: 'easeOutCubic'
          }
        );

        tween2.on('update', ({ factor }) => {
          for (let layer2And3Path of layer2And3Paths) {
            layer2And3Path.layer2.fillColor.alpha = 1 - factor;
          }
          layer1Raster.opacity = factor;
        });
      });
    };

    let layer2And3FlippedCounter = 0;

    const handleMouseMove = event => {
      const { x, y } = event.point;
      let gridX = Math.round(x / gridSize);
      let gridY = Math.round(y / gridSize);

      if (gridX >= numOfGridX) {
        gridX = numOfGridX - 1;
      }

      if (gridY >= numOfGridY) {
        gridY = numOfGridY - 1;
      }

      const pixelIdx = gridY * layer2And3Raster.width + gridX;

      const layer2And3Path = layer2And3Paths[pixelIdx];

      if (layer2And3Path === undefined) {
        console.log('Exception: ', gridX, gridY);
      } else {
        if (!layer2And3Path.isFlipped) {
          layer2And3Path.layer3.fillColor.alpha = 0;
          layer2And3Path.layer2.fillColor.alpha = 1;
          layer2And3Path.isFlipped = true;

          layer2And3FlippedCounter++;

          console.log(
            'fill progress: ',
            Math.ceil(
              (layer2And3FlippedCounter / layer1FadeInCounterThreshold) * 100
            ),
            '%'
          );

          if (
            !isLayer1FadedIn &&
            layer2And3FlippedCounter > layer1FadeInCounterThreshold
          ) {
            view.off('mousemove', handleMouseMove);
            fadeInLayer1();
          }
        }
      }
    };

    view.on('mousemove', handleMouseMove);

    view.onMouseMove = view.draw();
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
      <audio ref={audioRef} src={''} loop={true} />
    </div>
  );
};

export default Canvas;
