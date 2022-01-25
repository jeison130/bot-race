<script setup lang="ts">
import {Loader, LoaderOptions, google} from 'google-maps';
import {onMounted} from 'vue';
import finishLineImage from './assets/finishLine.png';
import {GetCurrentPositionService} from './services/getCurrentPosition.service';
import {GetDistanceBetweenPointsService} from './services/getDistanceBetweenPoints.service';

const getCurrentPositionService = new GetCurrentPositionService();
const getDistanceBetweenPointsService = new GetDistanceBetweenPointsService();

let googleMaps: google;
let map: any = null;
let finishLineMarker = null;

const center = {
  lat: 1.1478853,
  lng: -76.6557968,
};
let finishLinePosition = {
  ...center,
};
let finishLineCircle: any = null;

const botMarkers = [];
const minInitialBot = 5;
const maxInitialBot = 10;
const minDistanceForRace = 1000;

onMounted(async () => {
  try {
    const position = await getCurrentPositionService.run();
    const cords = position.coords;

    center.lat = cords.latitude;
    center.lng = cords.longitude;
  } catch (e) {
  }

  const options: LoaderOptions = {};
  const loader = new Loader('AIzaSyBhrFU_TViLuyhGwB78PBujTdXM1waidNc', options);

  googleMaps = await loader.load();

  map = new googleMaps.maps.Map(document.getElementById('map') as HTMLElement, {
    center,
    zoom: 13,
  });

  finishLineMarker = new googleMaps.maps.Marker({
    position: center,
    map,
    draggable: true,
    icon: finishLineImage,
  });

  finishLineMarker.addListener('dragend', changePositionFinishLine);
  finishLinePosition = {...center};

  finishLineCircle = new googleMaps.maps.Circle({
    strokeColor: '#FF0000',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: '#FF0000',
    fillOpacity: 0.25,
    map,
    center: finishLinePosition,
    radius: 2450,
    editable: true,
  });

  setTimeout(() => {
    generateBotMarkers();
  }, 100);
});

function randomIntFromInterval(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function generateBotMarkers() {
  const numberBots = randomIntFromInterval(minInitialBot, maxInitialBot);

  for (let i = 0; i < numberBots; i++) {
    const position = generatePositionIntoCircle();

    botMarkers[i] = new googleMaps.maps.Marker({
      map: map,
      position,
    });
  }
}

function generatePositionIntoCircle() {
  let point = null;

  while (!point) {
    const bounds = finishLineCircle.getBounds();
    map.fitBounds(bounds);
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    const ptLat = Math.random() * (ne.lat() - sw.lat()) + sw.lat();
    const ptLng = Math.random() * (ne.lng() - sw.lng()) + sw.lng();
    const newPoint = new googleMaps.maps.LatLng(ptLat, ptLng);

    let allowDistance = true;

    if (getDistanceBetweenPointsService.run(newPoint.lat(), newPoint.lng(), finishLinePosition.lat, finishLinePosition.lng) < minDistanceForRace) {
      allowDistance = false;
    }

    if (googleMaps.maps.geometry.spherical.computeDistanceBetween(newPoint, finishLineCircle.getCenter()) < finishLineCircle.getRadius() && allowDistance) {
      point = newPoint;
    }
  }

  return point;
}

function changePositionFinishLine($event: any) {
  finishLinePosition.lat = $event.latLng.lat();
  finishLinePosition.lng = $event.latLng.lng();

  finishLineCircle.setCenter(new googleMaps.maps.LatLng(finishLinePosition.lat, finishLinePosition.lng));
}


</script>

<template>
  <div>
    Prueba
  </div>
  <div id="map"></div>
</template>

<style>
#map {
  width: 100%;
  height: calc(100vh - 100px)
}
</style>
