import Canvas from './canvas';
import style from './app.css';

const App = _ => (
  <div className={style.App}>
    <div className={style.ecardContainer}>
      <Canvas />
    </div>
  </div>
);

export default App;
