import { useRef, useEffect, useState, useCallback } from 'preact/hooks';
import Paper from 'paper';
import style from './style.css';

// https://stackoverflow.com/questions/56197908/how-to-use-paperjs-with-react
// http://paperjs.org/tutorials/images/using-pixel-colors/

const { Size, Point, Raster, Path, Color } = Paper;

/* utils */

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

/* end of utils */

/* constants */

// canvas size
const canvasWidth = 550;
const canvasHeight = 320;

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

// button text
let buttonText = 'Turn volume on & play on the canvas!';
const pathname = window.location.pathname;
if (pathname.includes('index_tc.html')) {
  buttonText = '打開音量並在畫布上遊玩！';
}
if (pathname.includes('index_sc.html')) {
  buttonText = '打开音量并在画布上游玩！';
}

// styles
const hideStyle = {
  opacity: 0,
  visibility: 'hidden'
};

const showStyle = {
  opacity: 1,
  visibility: 'visible'
};

/* end of constants */

const Canvas = _ => {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  const layer1Raster = useRef(null);
  const layer2And3Raster = useRef(null);
  const layer2And3Paths = useRef([]);
  const layer2And3FlippedCounter = useRef(0);
  const isLayer1FadedIn = useRef(false);

  const [isStarted, setIsStarted] = useState(false);

  useEffect(async _ => {
    Paper.setup(canvasRef.current);
    const { view, project } = Paper;

    /* setting up layers */

    // layer 1
    layer1Raster.current = await loadRasterAsync(rasterSrc, raster => {
      raster.position = view.center;
    });

    // set up layer 1
    layer1Raster.current.size = new Size(canvasWidth, canvasHeight);

    layer1Raster.current.opacity = 0;

    // layers 2 and 3
    layer2And3Raster.current = await loadRasterAsync(rasterSrc, raster => {
      raster.visible = false;
    });

    layer2And3Paths.current = [];

    // set up layers 2 & 3

    // Since the example image we're using is much too large,
    // and therefore has way too many pixels, lets downsize it to
    layer2And3Raster.current.size = new Size(numOfGridX, numOfGridY);

    for (let y = 0; y < numOfGridY; y++) {
      for (let x = 0; x < numOfGridX; x++) {
        // Get the color of the pixel:
        const color = layer2And3Raster.current.getPixel(x, y);

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

        layer2And3Paths.current.push({
          layer2: layer2Path,
          layer3: layer3Path,
          isFlipped: false
        });
      }
    }

    // Move the active layer to the center of the view, so all
    // the created paths in it appear centered.
    project.activeLayer.position = view.center;

    /* end of setting up layers */

    /* initiating refs */

    setIsStarted(false);
    layer2And3FlippedCounter.current = 0;
    isLayer1FadedIn.current = false;

    /* end of initiating refs */

    view.draw();
  }, []);

  /* functions and event handlers */

  const fadeInLayer1 = useCallback(_ => {
    isLayer1FadedIn.current = true;
    console.log('fade in!');
    audioRef.current.volume = 0;
    audioRef.current.play();

    // dummy layer2And3Raster
    const tween1 = layer2And3Raster.current.tween(
      { myValue: 0 },
      { myValue: 1 },
      {
        duration: layer1FadeInTween1Duration,
        easing: 'easeOutCubic'
      }
    );

    tween1.on('update', ({ factor }) => {
      const layer2And3PathsCurrent = layer2And3Paths.current;
      for (let layer2And3Path of layer2And3PathsCurrent) {
        layer2And3Path.layer3.fillColor.alpha = 1 - factor;
        layer2And3Path.layer2.fillColor.alpha = 0.5 + 0.5 * factor;
      }
      audioRef.current.volume = 0.5 * factor;
    });

    tween1.then(_ => {
      // dummy layer2And3Raster
      const tween2 = layer2And3Raster.current.tween(
        { myValue: 0 },
        { myValue: 1 },
        {
          duration: layer1FadeInTween2Duration,
          easing: 'easeOutCubic'
        }
      );

      tween2.on('update', ({ factor }) => {
        const layer2And3PathsCurrent = layer2And3Paths.current;
        for (let layer2And3Path of layer2And3PathsCurrent) {
          layer2And3Path.layer2.fillColor.alpha = 1 - factor;
        }
        layer1Raster.current.opacity = factor;
        audioRef.current.volume = 0.5 + 0.5 * factor;
      });
    });
  }, []);

  const handleMouseMove = useCallback(event => {
    const { x, y } = event.point;
    let gridX = Math.round(x / gridSize);
    let gridY = Math.round(y / gridSize);

    if (gridX >= numOfGridX) {
      gridX = numOfGridX - 1;
    }

    if (gridY >= numOfGridY) {
      gridY = numOfGridY - 1;
    }

    const pixelIdx = gridY * numOfGridX + gridX;

    const layer2And3Path = layer2And3Paths.current[pixelIdx];

    if (layer2And3Path === undefined) {
      console.log('Exception: ', gridX, gridY);
    } else {
      if (!layer2And3Path.isFlipped) {
        layer2And3Path.layer3.fillColor.alpha = 0;
        layer2And3Path.layer2.fillColor.alpha = 1;
        layer2And3Path.isFlipped = true;

        const layer2And3FlippedCounterTemp =
          layer2And3FlippedCounter.current + 1;
        layer2And3FlippedCounter.current = layer2And3FlippedCounterTemp;

        console.log(
          'fill progress: ',
          Math.ceil(
            (layer2And3FlippedCounterTemp / layer1FadeInCounterThreshold) * 100
          ),
          '%'
        );

        if (
          !isLayer1FadedIn.current &&
          layer2And3FlippedCounterTemp > layer1FadeInCounterThreshold
        ) {
          deregisterMouseMove();
          fadeInLayer1();
        }
      }
    }
  }, []);

  const registerMouseMove = useCallback(
    _ => {
      const { view } = Paper;
      view.on('mousemove', handleMouseMove);
    },
    [handleMouseMove]
  );

  const deregisterMouseMove = useCallback(
    _ => {
      const { view } = Paper;
      view.off('mousemove', handleMouseMove);
    },
    [handleMouseMove]
  );

  const handleStartButtonClick = useCallback(_ => {
    registerMouseMove();
    setIsStarted(true);
  }, []);

  /* end of functions and event handlers */

  return (
    <div className={style.canvasContainer}>
      <canvas ref={canvasRef} className={style.ecardCanvas} />
      <button
        className={style.startButton}
        onClick={handleStartButtonClick}
        style={isStarted ? hideStyle : showStyle}
      >
        {buttonText}
      </button>
      <audio
        ref={audioRef}
        src={process.env.PUBLIC_PATH + 'assets/audio/bgm.mp3'}
        loop={true}
      />
    </div>
  );
};

export default Canvas;
