<script setup lang="ts">
// @ts-ignore
import faker from 'faker';
import {Loader, LoaderOptions, google} from 'google-maps';
import {onMounted, reactive, ref} from 'vue';
import finishLineImage from './assets/finish-line.png';
import checkeredFlag from './assets/checkered-flag.gif';
import {GetCurrentPositionService} from './services/getCurrentPosition.service';
import {GetDistanceBetweenPointsService} from './services/getDistanceBetweenPoints.service';
import {GetRandomIntFromIntervalService} from './services/getRandomIntFromInterval.service';
import {BotModel} from './models/bot.model';
import {
  maxBatteryConsumption,
  minDistanceTraveled,
  minInitialBot,
  maxDistanceTraveled,
  maxInitialBot,
  minBatteryConsumption,
  minDistanceForRace,
  maxBattery,
  batteryRecoveryTime,
} from './constants';

const getCurrentPositionService = new GetCurrentPositionService();
const getDistanceBetweenPointsService = new GetDistanceBetweenPointsService();
const getRandomIntFromIntervalService = new GetRandomIntFromIntervalService();

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

let intevelMoveBots: any = null;
let bots: BotModel[] = reactive([]);
let loadingMap = ref(true);
let raceHasStared = ref(false);
let raceIsOver = ref(false);
let counterInitRace = ref(3);
let startingRace = ref(false);

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
    loadingMap.value = false;
  }, 100);
});

function startRace() {
  startingRace.value = true;
  if (counterInitRace.value === 0) {
    startingRace.value = false;
    generateBotMarkers();
    raceHasStared.value = true;
    recalculatePositions();
    moveBots();
  } else {
    setTimeout(() => {
      counterInitRace.value -= 1;
      startRace();
    }, 1000);
  }
}

function restartingRace() {
  window.clearInterval(intevelMoveBots);
  bots.forEach((bot) => {
    bot.marker.setMap(null);
    bot.marker.setPosition(null);
    bot.marker.setVisible(false);
    bot.marker = null;
  });

  bots.splice(0, bots.length);

  startRace();
}

function moveBots() {
  intevelMoveBots = setInterval(() => {
    let countDistanceZero = 0;
    bots.forEach((bot) => {
      const {marker, distance} = bot;

      if (distance === 0) {
        countDistanceZero += 1;
        return;
      }

      const start = {
        lat: marker.position.lat(),
        lng: marker.position.lng(),
      };
      const end = finishLinePosition;

      let randomDistance = getRandomIntFromIntervalService.run(minDistanceTraveled, maxDistanceTraveled);

      //Battery consumption
      let batteryConsumption = getRandomIntFromIntervalService.run(minBatteryConsumption, maxBatteryConsumption);

      if (batteryConsumption > bot.battery) {
        batteryConsumption = bot.battery;
      }

      bot.battery -= batteryConsumption;

      // Check battery
      if (bot.battery === 0 && bot.batteryRecoveryTime > 0) {
        bot.batteryRecoveryTime -= 1;
        return;
      } else if (bot.battery === 0 && bot.batteryRecoveryTime === 0) {
        bot.battery = maxBattery;
        bot.batteryRecoveryTime = batteryRecoveryTime;
      }

      if (distance < randomDistance) {
        marker.setPosition(new googleMaps.maps.LatLng(end.lat, end.lng));
        bot.distance = 0;
        return;
      }

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

    if (countDistanceZero === bots.length) {
      raceIsOver.value = true;
    }

    recalculatePositions();
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
    addBot();
  }
}

function addBot() {
  const position = generatePositionIntoCircle();
  const fakerName = faker.name.findName();

  bots.push({
    name: fakerName,
    distance: getDistanceBetweenPointsService.run(finishLinePosition.lat, finishLinePosition.lng, position.lat(), position.lng()),
    marker: new googleMaps.maps.Marker({
      map: map,
      position,
      title: fakerName,
    }),
    battery: maxBattery,
    batteryRecoveryTime,
  });
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
  <div class="shadow bg-base-200 drawer drawer-mobile drawer-end">
    <input id="my-drawer-2" type="checkbox" class="drawer-toggle">
    <div class="drawer-content">
      <div class="navbar mb-2 shadow-lg bg-neutral text-neutral-content app-bar">
        <div class="flex justify-center flex-1 px-2 mx-2 text-lg font-bold w-full">
          Bot Race
        </div>
        <div class="mt-auto">
          <label for="my-drawer-2" class="mb-4 btn btn-ghost btn-square drawer-button lg:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                 class="inline-block w-6 h-6 stroke-current">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </label>
        </div>
      </div>

      <div v-if="loadingMap" class="flex justify-center items-center map">
        <div class="spinner"></div>
      </div>
      <div class="map" id="map"></div>
    </div>
    <div class="drawer-side">
      <label for="my-drawer-2" class="drawer-overlay"></label>

      <div class="overflow-y-auto bg-base-100 drawer-rigth">
        <div v-if="!raceHasStared" class="flex flex-col gap-2 p-3 md:p-4 h-full">
          <h1 class="text-2xl font-bold text-center">Bienvenidos a la carrera de bots</h1>
          <p class="text-xl font-extralight">
            Para iniciar la carrera, mueva el puntero <img :src="finishLineImage" class="inline w-6"> para indicar la
            linea de meta, la cual deberan llegar los bots
          </p>

          <button class="btn bg-neutral mt-2" :disabled="loadingMap || startingRace" @click="startRace">
            Iniciar la carrera
          </button>

          <div v-if="startingRace" class="flex flex-col justify-center items-center text-2xl h-full">
            <span class="font-extralight">
              Iniciando la carrera
            </span>
            <span class="font-bold">
              {{ counterInitRace }}
            </span>
          </div>
        </div>

        <div v-else class="flex flex-col gap-2 p-3 md:p-4">
          <div class="flex flex-row justify-between items-center">
            <h1 class="text-2xl font-bold text-center">
              Estadísticas de la carrera
            </h1>

            <label for="my-drawer-2" class="mb-4 btn btn-ghost btn-square drawer-button lg:hidden">
              <svg class="inline-block w-6 h-6 stroke-current" viewBox="0 0 20 20">
                <path fill="none"
                      d="M15.898,4.045c-0.271-0.272-0.713-0.272-0.986,0l-4.71,4.711L5.493,4.045c-0.272-0.272-0.714-0.272-0.986,0s-0.272,0.714,0,0.986l4.709,4.711l-4.71,4.711c-0.272,0.271-0.272,0.713,0,0.986c0.136,0.136,0.314,0.203,0.492,0.203c0.179,0,0.357-0.067,0.493-0.203l4.711-4.711l4.71,4.711c0.137,0.136,0.314,0.203,0.494,0.203c0.178,0,0.355-0.067,0.492-0.203c0.273-0.273,0.273-0.715,0-0.986l-4.711-4.711l4.711-4.711C16.172,4.759,16.172,4.317,15.898,4.045z"></path>
              </svg>
            </label>
          </div>

          <button v-if="!raceIsOver" class="btn bg-neutral" @click="addBot">
            Agregar Bot
          </button>

          <button v-else class="btn bg-neutral" @click="restartingRace">
            Iniciar nueva carrera
          </button>

          <ul class="flex flex-col gap-2 pl-0">
            <li v-for="(bot, index) in bots" class="flex flex-col border-b py-4 gap-2 relative">
              <div v-if="bot.battery === 0" class="absolute left-0 right-0 ml-auto mr-auto w-48 h-10 font-bold text-xl">
                Regarcando {{ bot.batteryRecoveryTime + 1 }}
              </div>
              <div :class="{
            'flex':true,
             'gap-4': true,
             'justify-between': true,
             'bg-black': bot.battery == 0,
             'opacity-25': bot.battery == 0,
          }">
            <span
                v-if="bot.distance > 0"
                :class="{
            flex: true,
            'items-center': true,
            'text-center': true,
            'text-primary-content': true,
            'px-5': true,
            'py-2': true,
            'font-bold': true,
            'text-3xl': true,
            'bg-error': index === (bots.length - 1),
            'bg-success': index === 0,
            'bg-warning': index !== 0 && index !== (bots.length - 1),
          }">
              {{ index + 1 }}
          </span>
                <img v-else class="w-14" :src="checkeredFlag">

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
                  <span class="text-2xl font-bold">
              {{ Math.round(bot.distance) }} <span class="text-xs">mts</span>
            </span>
                </div>
              </div>

              <progress class="progress progress-primary" :value="bot.battery" :max="maxBattery"></progress>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>

</template>

<style>
:root {
  --heigth-app-bar: 3rem;
}

.app-bar {
  height: var(--heigth-app-bar);
}

.map {
  width: 100%;
  height: calc(100vh - var(--heigth-app-bar));
}

.drawer-rigth {
  max-width: 25rem;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: #09f;

  animation: spin 1s ease infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
