import React from "react";
import { useContext } from "react";
import { MapBoxContext } from "./MapBoxContext";
import { useRef, useLayoutEffect, useState } from "react";
import ReactMapGL from "react-map-gl";
import { CanvasOverlay } from "react-map-gl";
import { LngLatBounds, LngLat } from "mapbox-gl";
import { geoPath, geoTransform, geoIdentity } from "d3-geo";

function BoundingBoxOverlay({ boundingBox }) {
  function redraw({ width, height, ctx, isDragging, project, unproject }) {
    const center = project(boundingBox.getCenter().toArray());
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.arc(center[0], center[1], 10.0, 0, 2 * Math.PI, false);
    ctx.fillStyle = "green";
    ctx.fill();

    const topLeft = project(boundingBox.getNorthWest().toArray());
    const bottomRight = project(boundingBox.getSouthEast().toArray());
    ctx.beginPath();
    ctx.rect(
      topLeft[0],
      topLeft[1],
      bottomRight[0] - topLeft[0],
      bottomRight[1] - topLeft[1]
    );
    ctx.lineWidth = 3;
    ctx.strokeStyle = "red";
    ctx.stroke();
  }

  return <CanvasOverlay redraw={redraw} />;
}

function FeatureOverlay({ boundingBox, featureLoader }) {
  function redraw({ width, height, ctx, isDragging, project, unproject }) {
    console.time("redraw");
    const center = project(boundingBox.getCenter().toArray());
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.arc(center[0], center[1], 10.0, 0, 2 * Math.PI, false);
    ctx.fillStyle = "green";
    ctx.fill();

    const geoJsonBounds = geoJsonBoundsFromLngLatBounds(boundingBox);

    const reticuleProjection = geoTransform({
      point: function(lon, lat) {
        const point = project(new LngLat(lon, lat).toArray());
        this.stream.point(point[0], point[1]);
      }
    });

    const clip = geoIdentity().clipExtent([
      project(boundingBox.getNorthWest().toArray()),
      project(boundingBox.getSouthEast().toArray())
    ]);

    const generator = geoPath()
      // .projection(reticuleProjection)
      .projection({
        stream: function(s) {
          return reticuleProjection.stream(clip.stream(s));
        }
      })
      .context(ctx);

    if (!isDragging) {
      const features = featureLoader();
      const geoJson = { type: "FeatureCollection", features };

      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.strokeStyle = "blue";
      generator(geoJson);
      ctx.stroke();
    }

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.strokeStyle = "red";
    generator(geoJsonBounds);
    ctx.stroke();

    console.timeEnd("redraw");
  }

  return <CanvasOverlay redraw={redraw} />;
}

function reticuleFromMapBounds(bounds) {
  const northSouthExtent = bounds.getSouth() - bounds.getNorth();
  const westEastExtent = bounds.getEast() - bounds.getWest();

  const indent = 0.2;

  const reticuleBounds = LngLatBounds.convert([
    [
      bounds.getWest() + indent * westEastExtent,
      bounds.getNorth() + indent * northSouthExtent
    ],
    [
      bounds.getWest() + (1.0 - indent) * westEastExtent,
      bounds.getNorth() + (1.0 - indent) * northSouthExtent
    ]
  ]);

  return reticuleBounds;
}

function geoJsonBoundsFromLngLatBounds(bounds) {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              bounds.getNorthEast().toArray(),
              bounds.getSouthEast().toArray(),
              bounds.getSouthWest().toArray(),
              bounds.getNorthWest().toArray(),
              bounds.getNorthEast().toArray()
            ]
          ]
        }
      }
    ]
  };
}

export function MapView({ city }) {
  const mapbox = useContext(MapBoxContext);
  const containerRef = useRef(null);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 400,
    height: 800
  });
  const [reticuleBounds, setReticuleBounds] = useState(null);
  const [featureLoader, setFeatureLoader] = useState(null);

  useLayoutEffect(() => {
    const { width, height } = containerRef.current.getBoundingClientRect();
    setContainerDimensions({ width, height });
  }, [containerRef]);

  const { width, height } = containerDimensions;

  const [viewport, setViewport] = useState({
    zoom: mapbox.default_zoom,
    ...city.location
  });
  function viewportUpdated(viewport) {
    const { zoom, latitude, longitude } = viewport;
    setViewport({ zoom, latitude, longitude });
  }

  function onBoundsChanged(map) {
    const reticule = reticuleFromMapBounds(map.getBounds());
    setReticuleBounds(reticule);
    setFeatureLoader(() => {
      return () => {
        return map.queryRenderedFeatures([
          map.project(reticule.getNorthEast().toArray()),
          map.project(reticule.getSouthWest().toArray())
        ]);
      };
    });
  }

  function onLoad({ target }) {
    const map = target;
    console.log("loaded");
    onBoundsChanged(map);
    map.on("moveend", () => {
      onBoundsChanged(map);
    });
  }

  return (
    <div ref={containerRef} className="map">
      <ReactMapGL
        width={width}
        height={height}
        {...viewport}
        onViewportChange={viewportUpdated}
        mapboxApiAccessToken={mapbox.access_token}
        onLoad={onLoad}
      >
        {reticuleBounds && featureLoader != null && (
          <FeatureOverlay
            boundingBox={reticuleBounds}
            featureLoader={featureLoader}
          />
        )}
      </ReactMapGL>
    </div>
  );
}
