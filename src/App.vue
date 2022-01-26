<script setup lang="ts">
// @ts-ignore
import faker from 'faker';
import {Loader, LoaderOptions, google} from 'google-maps';
import {onMounted, reactive} from 'vue';
import finishLineImage from './assets/finishLine.png';
import {GetCurrentPositionService} from './services/getCurrentPosition.service';
import {GetDistanceBetweenPointsService} from './services/getDistanceBetweenPoints.service';
import {GetRandomIntFromIntervalService} from './services/getRandomIntFromInterval.service';
import {BotModel} from './models/bot.model';

const getCurrentPositionService = new GetCurrentPositionService();
const getDistanceBetweenPointsService = new GetDistanceBetweenPointsService();
const getRandomIntFromIntervalService = new GetRandomIntFromIntervalService();

let googleMaps: google;
let map: any = null;
let finishLineMarker = null;
const minInitialBot = 5;
const maxInitialBot = 10;
const minDistanceForRace = 1000;
const minDistanceTraveled = 50;
const maxDistanceTraveled = 100;

const center = {
  lat: 1.1478853,
  lng: -76.6557968,
};
let finishLinePosition = {
  ...center,
};
let finishLineCircle: any = null;

const bots: BotModel[] = reactive([]);

onMounted(async () => {
  try {
    const position = await getCurrentPositionService.run();
    const cords = position.coords;

    center.lat = cords.latitude;
    center.lng = cords.longitude;
  } catch (e) {
  }

  const options: LoaderOptions = {};

  const loader = new Loader(import.meta.env.VITE_GOOGLE_MAPS as string, options);

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
    recalculatePositions();
    moveBots();
  }, 100);
});

function moveBots() {
  setInterval(() => {
    console.log('iniciando a mover');
    bots.forEach((bot) => {
      const {marker, distance} = bot;

      const start = {
        lat: marker.position.lat(),
        lng: marker.position.lng(),
      };
      const end = finishLinePosition;
      const randomDistance = getRandomIntFromIntervalService.run(minDistanceTraveled, maxDistanceTraveled);
      const n = distance / randomDistance;

      let lat: number;
      let lng: number;

      let coordinates: any[] = [];

      for (let i = n - 1; i > 0; i--) {
        coordinates.push({
          lat: start.lat * i / n + end.lat * (n - i) / n,
          lng: start.lng * i / n + end.lng * (n - i) / n,
        });
      }

      lat = coordinates[0].lat;
      lng = coordinates[0].lng;
      marker.setPosition(new googleMaps.maps.LatLng(lat, lng));

      bot.distance = getDistanceBetweenPointsService.run(
          finishLinePosition.lat,
          finishLinePosition.lng,
          marker.position.lat(),
          marker.position.lng(),
      );

    });
    recalculatePositions();

    console.log('Terminando de mover');
  }, 1000);
}

function recalculatePositions() {
  bots.sort((botA, botB) => {
    const distanceA = botA.distance;
    const distanceB = botB.distance;

    if (distanceA < distanceB) return -1;
    if (distanceA > distanceB) return 1;
    return 0;
  });
}

function generateBotMarkers() {
  const numberBots = getRandomIntFromIntervalService.run(minInitialBot, maxInitialBot);

  for (let i = 0; i < numberBots; i++) {
    const position = generatePositionIntoCircle();

    bots[i] = {
      name: faker.name.findName(),
      distance: getDistanceBetweenPointsService.run(finishLinePosition.lat, finishLinePosition.lng, position.lat(), position.lng()),
      marker: new googleMaps.maps.Marker({
        map: map,
        position,
        title: 'Bot ' + i + 1,
      }),
    };
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

  const position = new googleMaps.maps.LatLng(finishLinePosition.lat, finishLinePosition.lng);

  finishLineCircle.setCenter(position);
  map.setCenter(position);
}


</script>

<template>
  <div>
    Prueba
  </div>
  <div class="flex">
    <div class="flex-auto" id="map"></div>
    <div class="w-1/3">
      <h1 class="text-2xl font-bold text-center">
        Estadísticas de la carrera
      </h1>

      <ul class="flex flex-col gap-8">
        <li v-for="(bot, index) in bots" class="flex gap-4 justify-between border-b p-4">
          <span class="flex items-center text-center bg-primary text-primary-content px-5 py-2 font-bold text-3xl">
            {{ index + 1 }}
          </span>

          <div class="flex flex-col">
            <span class="text-xl">
              {{ bot.name.split(' ')[0] }}
            </span>
            <span class="text-2xl font-bold">{{ bot.name.split(' ')[1] }}</span>
          </div>

          <div class="flex flex-col text-right">
            <span class="text-xs">
              Distancia restante
            </span>
            <span class="text-3xl font-bold">
              {{ Math.round(bot.distance) }} <span class="text-xs">mts</span>
            </span>
          </div>
        </li>
      </ul>
    </div>
  </div>

</template>

<style>
#map {
  width: 100%;
  height: calc(100vh - 100px)
}
</style>
