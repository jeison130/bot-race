<script setup lang="ts">
import {Loader, LoaderOptions, google} from 'google-maps';
import {onMounted} from 'vue';
import finishLineImage from './assets/finishLine.png';
import {GetCurrentPositionService} from './services/getCurrentPosition.service';
import {GetDistanceBetweenPointsService} from './services/getDistanceBetweenPoints.service';

const getCurrentPositionService = new GetCurrentPositionService();
const getDistanceBetweenPointsService = new GetDistanceBetweenPointsService();

let googleMaps: google;
let map = null;
let finishLineMarker = null;

const center = {
  lat: 1.1478853,
  lng: -76.6557968,
};
let finishLinePosition = {
  ...center,
};

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
    zoom: 14,
  });

  finishLineMarker = new googleMaps.maps.Marker({
    position: center,
    map,
    draggable: true,
    icon: finishLineImage,
  });

  finishLineMarker.addListener('dragend', changePositionFinishLine);
  finishLinePosition = {...center};
});

function changePositionFinishLine($event: any) {
  finishLinePosition.lat = $event.latLng.lat();
  finishLinePosition.lng = $event.latLng.lng();

  console.log(getDistanceBetweenPointsService.run(finishLinePosition.lat, finishLinePosition.lng, center.lat, center.lng));
}


</script>

<template>
  <div>
    Prueba
  </div>
  <div id="map" style="width: 100%; height: calc(100vh - 100px)"></div>
</template>

<style>

</style>
