import { useRef, useEffect, useCallback, useState } from 'preact/hooks';
import Paper from 'paper';
import style from './style.css';

// https://stackoverflow.com/questions/56197908/how-to-use-paperjs-with-react

const { Raster, Path } = Paper;

const Canvas = _ => {
  const [isPlay, setIsPlay] = useState(false);
  const [isShowResetButton, setIsShowResetButton] = useState(false);

  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(_ => {
    Paper.setup(canvasRef.current);

    const view = Paper.view;

    // http://paperjs.org/tutorials/images/using-pixel-colors/

    // Create a raster item using the image tag with id='mona'
    const raster = new Raster('mona');

    // Hide the raster:
    raster.visible = false;

    // The size of our grid cells:
    const gridSize = 12;

    // Space the cells by 120%:
    const spacing = 1.2;

    // As the web is asynchronous, we need to wait for the raster to load
    // before we can perform any operation on its pixels.
    raster.on('load', _ => {
      // Since the example image we're using is much too large,
      // and therefore has way too many pixels, lets downsize it to
      // 40 pixels wide and 30 pixels high:
      raster.size = new Size(40, 30);

      for (let y = 0; y < raster.height; y++) {
        for (let x = 0; x < raster.width; x++) {
          // Get the color of the pixel:
          const color = raster.getPixel(x, y);

          // Create a circle shaped path:
          const path = new Path.Circle({
            center: new Point(x, y) * gridSize,
            radius: gridSize / 2 / spacing,
            fillColor: 'black'
          });

          // Scale the path by the amount of gray in the pixel color:
          path.scale(1 - color.gray);
        }
      }

      // Move the active layer to the center of the view, so all
      // the created paths in it appear centered.
      project.activeLayer.position = view.center;
    });

    view.onFrame = event => {};

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
