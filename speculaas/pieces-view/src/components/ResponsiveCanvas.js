import React, { Component } from 'react';
import Measure from 'react-measure';

const LANDSCAPE = 'landscape';
const PORTRAIT = 'portrait';

function maxDimensions(dimensionsList) {
  let max = {
    width: dimensionsList[0].width,
    height: dimensionsList[0].height,
  };
  const reducer = (accum, entry) => {
    return {
      width: Math.max(accum.width, entry.width),
      height: Math.max(accum.height, entry.height),
    }
  };
  return dimensionsList.reduce(reducer, max);
}

const Renderer = (bgColor) => {
  return (context, dimensions, pieces) => {
    context.fillStyle = bgColor;
    context.fillRect(0, 0, dimensions.width, dimensions.height);

    const bitmapImages = pieces.map(p => p.bitmapImage);
    const max = maxDimensions(bitmapImages);
    context.save();
    context.scale(
      dimensions.width / max.width,
      dimensions.height / max.height
    );
    context.strokeStyle = 'black';
    bitmapImages.forEach(bitmapImage => {
      context.strokeRect(bitmapImage.x, bitmapImage.y, bitmapImage.width, bitmapImage.height);
    });
    context.restore();

    context.fillStyle = 'green';
    context.font = '20px sans-serif';
    context.fillText(`pieces: ${pieces.length}`, 10, dimensions.height - 10);
  }
};

const LandscapeRenderer = Renderer('red');

const PortraitRenderer = Renderer('blue');

class FixedSizeCanvas extends Component {
  constructor(props) {
    super(props);

    this.state = ({
      dimensions: this.dimensionsFromContainerDimensions(props.containerDimensions)
    });

    this.dimensionsFromContainerDimensions = this.dimensionsFromContainerDimensions.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      dimensions: this.dimensionsFromContainerDimensions(nextProps.containerDimensions)
    });
  }

  componentDidMount() {
    this.updateCanvas();
  }

  componentDidUpdate() {
    this.updateCanvas();
  }

  updateCanvas() {
    const context = this.refs.canvas.getContext('2d');
    context.clearRect(0,0, this.state.dimensions.width, this.state.dimensions.height);
    context.save();
    this.props.rendererFn(context, this.state.dimensions, this.props.pieces);
    context.restore();
  }

  render() {
    return <canvas ref="canvas" width={this.state.dimensions.width} height={this.state.dimensions.height}/>;
  }

  dimensionsFromContainerDimensions(containerDimensions) {
    /*
      forcedBorder is required as otherwise we get in a loop with our parent Measure:
      1. We are given our containing size
      2. We go to that size
      3. Parent detects that overall bounding rect has changed, in this case to be larger
      4. Goto 1, where height is larger each time
      => Canvas keeps on getting bigger until it reaches some bound on containing size
     */
    const forcedBorder = 10;
    return this.shrink(this.normalize(containerDimensions), forcedBorder);
  }

  shrink(dimensions, value) {
    return {
      width: dimensions.width - value,
      height: dimensions.height - value
    };
  }

  normalize(dimensions) {
    return {
      width: Math.floor(dimensions.width),
      height: Math.floor(dimensions.height)
    };
  }
}

class ResponsiveCanvas extends Component {
  constructor(props) {
    super(props);

    this.state = {
      orientation: LANDSCAPE,
      dimensions: { width: 100, height: 100 },
    };

    this.onResize = this.onResize.bind(this);
    this.canvasForOrientation = this.canvasForOrientation.bind(this);
  }

  onResize(contentRect) {
    const { bounds } = contentRect;

    this.setState({
      orientation: this.orientation(bounds),
      dimensions: bounds
    });
  }

  orientation(dimensions) {
    if (dimensions.width >= dimensions.height) {
      return LANDSCAPE;
    }
    else {
      return PORTRAIT;
    }
  }

  canvasForOrientation(orientation, dimensions) {
    if (orientation === LANDSCAPE) {
      return <FixedSizeCanvas
        containerDimensions={dimensions}
        rendererFn={LandscapeRenderer}
        pieces={this.props.pieces}
      />;
    }
    else {
      return <FixedSizeCanvas
        containerDimensions={dimensions}
        rendererFn={PortraitRenderer}
        pieces={this.props.pieces}
      />;
    }
  }

  render() {
    const { orientation, dimensions } = this.state;

    return (
      <Measure
        bounds
        onResize={this.onResize}
      >
        {({ measureRef }) => (
          <div className='CanvasContainer' ref={measureRef}>
            { this.canvasForOrientation(orientation, dimensions) }
          </div>
        )}
      </Measure>
    )
  }
}

export default ResponsiveCanvas;
