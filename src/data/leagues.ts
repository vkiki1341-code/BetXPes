
import { League } from "@/types/betting";
// Premier League
import arsenalLogo from "@/assets/teams/arsenal.png";
import astonVillaLogo from "@/assets/teams/aston-villa.png";
import bournemouthLogo from "@/assets/teams/bournemouth.png";
import brightonLogo from "@/assets/teams/brighton.png";
import chelseaLogo from "@/assets/teams/chelsea.png";
import crystalPalaceLogo from "@/assets/teams/crystal-palace.png";
import evertonLogo from "@/assets/teams/everton.png";
import fulhamLogo from "@/assets/teams/fulham.png";
import leicesterLogo from "@/assets/teams/leicester.png";
import liverpoolLogo from "@/assets/teams/liverpool.png";
import manCityLogo from "@/assets/teams/manchester-city.png";
import manUtdLogo from "@/assets/teams/manchester-united.png";
import newcastleLogo from "@/assets/teams/newcastle.png";
import nottinghamLogo from "@/assets/teams/nottingham-forest.png";
import southamptonLogo from "@/assets/teams/southampton.png";
import spursLogo from "@/assets/teams/tottenham.png";
import wolvesLogo from "@/assets/teams/wolves.png";
// La Liga
import alavesLogo from "@/assets/teams/La Liga/Deportivo-Alaves.png";
import athBilbaoLogo from "@/assets/teams/La Liga/Athletic Club.png";
import atleticoLogo from "@/assets/teams/La Liga/Atletico-Madrid.png";
import barcelonaLogo from "@/assets/teams/La Liga/FC-Barcelona.png";

import celtaLogo from "@/assets/teams/La Liga/RC Celta de Vigo.png";
import getafeLogo from "@/assets/teams/La Liga/Getafe.png";
import gironaLogo from "@/assets/teams/La Liga/Girona.png";
import mallorcaLogo from "@/assets/teams/La Liga/Mallorca.png";
import osasunaLogo from "@/assets/teams/La Liga/Osasuna.png";
import rayoLogo from "@/assets/teams/La Liga/Rayo Vallecano.png";
import betisLogo from "@/assets/teams/La Liga/Real-Betis.png";
import realMadridLogo from "@/assets/teams/La Liga/Real-Madrid-Logo.png";
import sociedadLogo from "@/assets/teams/La Liga/Real Sociedad.png";
import sevillaLogo from "@/assets/teams/La Liga/Sevilla.png";
import valenciaLogo from "@/assets/teams/La Liga/Valencia.png";
import villarrealLogo from "@/assets/teams/La Liga/Villarreal.png";
import espanyolLogo from "@/assets/teams/La Liga/rcd-espanyol-de-barcelona.png";
// Bundesliga
import augsburgLogo from "@/assets/teams/Bundesliga/FC Augsburg.png";
import leverkusenLogo from "@/assets/teams/Bundesliga/Bayer-Leverkusen.png";
import bayernLogo from "@/assets/teams/Bundesliga/Bayern-Munich.png";
import gladbachLogo from "@/assets/teams/Bundesliga/Borussia Mönchengladbach.png";
import dortmundLogo from "@/assets/teams/Bundesliga/Borussia-Dortmund.png";
import frankfurtLogo from "@/assets/teams/Bundesliga/Eintracht-Frankfurt.png";
import kolnLogo from "@/assets/teams/Bundesliga/FC Köln.png";
import mainzLogo from "@/assets/teams/Bundesliga/FSV Mainz 05.png";
import freiburgLogo from "@/assets/teams/Bundesliga/SC Freiburg.png";
import herthaLogo from "@/assets/teams/Bundesliga/Hamburger SV.png";
import hoffenheimLogo from "@/assets/teams/Bundesliga/Hoffenheim.png";
import leipzigLogo from "@/assets/teams/Bundesliga/RB Leipzig.png";
import stuttgartLogo from "@/assets/teams/Bundesliga/VfB-Stuttgart.png";
import unionLogo from "@/assets/teams/Bundesliga/Union Berlin.png";
import bremenLogo from "@/assets/teams/Bundesliga/Werder Bremen.png";
import wolfsburgLogo from "@/assets/teams/Bundesliga/Wolfsburg.png";
// Serie A
import acMilanLogo from "@/assets/teams/Serie A/AC Milan.png";
import atalantaLogo from "@/assets/teams/Serie A/Atalanta.png";
import bolognaLogo from "@/assets/teams/Serie A/Bologna_F.C._1909.png";
import cagliariLogo from "@/assets/teams/Serie A/Cagliari.png";
import fiorentinaLogo from "@/assets/teams/Serie A/Fiorentina.png";
import genoaLogo from "@/assets/teams/Serie A/Genoa CFC.png";
import interLogo from "@/assets/teams/Serie A/Inter-Milan.png";
import juventusLogo from "@/assets/teams/Serie A/Juventus.png";
import lazioLogo from "@/assets/teams/Serie A/S.S. Lazio.png";
import lecceLogo from "@/assets/teams/Serie A/us_lecce.png";
import napoliLogo from "@/assets/teams/Serie A/SSC_Napoli.png";
import romaLogo from "@/assets/teams/Serie A/AS-Roma.png";
import sassuoloLogo from "@/assets/teams/Serie A/Sassuolo.png";
import torinoLogo from "@/assets/teams/Serie A/Torino FC.png";
import udineseLogo from "@/assets/teams/Serie A/Udinese Calcio.png";
import veronaLogo from "@/assets/teams/Serie A/hellas-verona-fc.png";
// Public Missing logos (from /public/missing/)
const brentfordLogo = "/missing/Brentford.png";
const ipswichLogo = "/missing/Ipswich.png";
const westHamLogo = "/missing/west-ham-united.png";
const cadizLogo = "/missing/cadiz.png";
const empoliLogo = "/missing/Empoli.png";
const monzaLogo = "/missing/Monza.png";
const salerntianaLogo = "/missing/salernitana-.png";
const sampodoriaLogo = "/missing/sampdoria.png";
const bochumLogo = "/missing/Bochum.png";
const schalke04Logo = "/missing/Schalke.png";
const nzoiaLogo = "/missing/Nzoia.png";
const wazitoLogo = "/missing/Wazito.png";
const zooLogo = "/missing/zoo.png";
// KPL (Kenya)
import afcLeopardsLogo from "@/assets/teams/KPL/AFC-Leopards.png";
import bandariLogo from "@/assets/teams/KPL/Bandari F.png";
import bidcoLogo from "@/assets/teams/KPL/Bidco United F.C.png";
import gorMahiaLogo from "@/assets/teams/KPL/Gor Mahia.png";
import homeboyzLogo from "@/assets/teams/KPL/Kakamega Homeboyz F.C..png";
import sharksLogo from "@/assets/teams/KPL/F.C. Kariobangi Sharks.png";
import kcbLogo from "@/assets/teams/KPL/Kenya Commercial Bank Football Team.png";
import mathareLogo from "@/assets/teams/KPL/Mathare United F.png";
import murangaLogo from "@/assets/teams/KPL/Murang'a SEAL FC.png";
import cityStarsLogo from "@/assets/teams/KPL/Nairobi United FC.png";

import postaLogo from "@/assets/teams/KPL/Posta Rangers F.C.png";
import shabanaLogo from "@/assets/teams/KPL/Shabana F.C.png";
import sofapakaLogo from "@/assets/teams/KPL/Sofapaka F.png";
import tuskerLogo from "@/assets/teams/KPL/Tusker F.C..png";
import ulinziLogo from "@/assets/teams/KPL/Ulinzi Stars F.C..png";

export const leagues: League[] = [
  {
    name: "Premier League",
    country: "England",
    countryCode: "en",
    flag: "🇬🇧",
    teams: [
      { name: "Arsenal", shortName: "Arsenal", icon: "🔴", logo: arsenalLogo },
      { name: "Aston Villa", shortName: "A.Villa", icon: "🦁", logo: astonVillaLogo },
      { name: "AFC Bournemouth", shortName: "Bournemouth", icon: "🍒", logo: bournemouthLogo },
      { name: "Brentford", shortName: "Brentford", icon: "🐝", logo: brentfordLogo },
      { name: "Brighton & Hove Albion", shortName: "Brighton", icon: "⚪", logo: brightonLogo },
      { name: "Chelsea", shortName: "Chelsea", icon: "💙", logo: chelseaLogo },
      { name: "Crystal Palace", shortName: "C.Palace", icon: "🦅", logo: crystalPalaceLogo },
      { name: "Everton", shortName: "Everton", icon: "🔵", logo: evertonLogo },
      { name: "Fulham", shortName: "Fulham", icon: "⚫", logo: fulhamLogo },
      { name: "Ipswich Town", shortName: "Ipswich", icon: "🔵", logo: ipswichLogo },
      { name: "Leicester City", shortName: "Leicester", icon: "🦊", logo: leicesterLogo },
      { name: "Liverpool", shortName: "Liverpool", icon: "🔴", logo: liverpoolLogo },
      { name: "Manchester City", shortName: "Man City", icon: "💙", logo: manCityLogo },
      { name: "Manchester United", shortName: "Man Utd", icon: "😈", logo: manUtdLogo },
      { name: "Newcastle United", shortName: "Newcastle", icon: "⚫", logo: newcastleLogo },
      { name: "Nottingham Forest", shortName: "N.Forest", icon: "🌲", logo: nottinghamLogo },
      { name: "Southampton", shortName: "Southampton", icon: "⚪", logo: southamptonLogo },
      { name: "Tottenham Hotspur", shortName: "Spurs", icon: "⚪", logo: spursLogo },
      { name: "West Ham United", shortName: "West Ham", icon: "⚒️", logo: westHamLogo },
      { name: "Wolverhampton Wanderers", shortName: "Wolves", icon: "🐺", logo: wolvesLogo },
    ],
  },
  {
    name: "La Liga",
    country: "Spain",
    countryCode: "es",
    flag: "🇪🇸",
    teams: [
      { name: "Alavés", shortName: "Alaves", icon: "🔵", logo: alavesLogo },
      { name: "Athletic Bilbao", shortName: "Bilbao", icon: "🦁", logo: athBilbaoLogo },
      { name: "Atlético Madrid", shortName: "Atletico", icon: "🔴", logo: atleticoLogo },
      { name: "Barcelona", shortName: "Barcelona", icon: "🔵", logo: barcelonaLogo },
      { name: "Cádiz", shortName: "Cadiz", icon: "💛", logo: cadizLogo },
      { name: "Celta Vigo", shortName: "Celta", icon: "⚪", logo: celtaLogo },
      { name: "Getafe", shortName: "Getafe", icon: "🔵", logo: getafeLogo },
      { name: "Girona", shortName: "Girona", icon: "🔴", logo: gironaLogo },
      { name: "Mallorca", shortName: "Mallorca", icon: "🔴", logo: mallorcaLogo },
      { name: "Osasuna", shortName: "Osasuna", icon: "🔴", logo: osasunaLogo },
      { name: "Rayo Vallecano", shortName: "Rayo", icon: "⚡", logo: rayoLogo },
      { name: "Real Betis", shortName: "Betis", icon: "💚", logo: betisLogo },
      { name: "Real Madrid", shortName: "Real Madrid", icon: "👑", logo: realMadridLogo },
      { name: "Real Sociedad", shortName: "Sociedad", icon: "🔵", logo: sociedadLogo },
      { name: "Sevilla", shortName: "Sevilla", icon: "⚪", logo: sevillaLogo },
      { name: "Valencia", shortName: "Valencia", icon: "🦇", logo: valenciaLogo },
      { name: "Villarreal", shortName: "Villarreal", icon: "💛", logo: villarrealLogo },
      { name: "Espanyol", shortName: "Espanyol", icon: "🔵", logo: espanyolLogo },
      { name: "Espanyol", shortName: "Espanyol", icon: "🔵", logo: espanyolLogo },
      // ...existing code...
      { name: "Atalanta", shortName: "Atalanta", icon: "🖤", logo: atalantaLogo },
      { name: "Bologna", shortName: "Bologna", icon: "🔴", logo: bolognaLogo },
      { name: "Cagliari", shortName: "Cagliari", icon: "🔵", logo: cagliariLogo },
      { name: "Empoli", shortName: "Empoli", icon: "🔵", logo: empoliLogo },
      { name: "Fiorentina", shortName: "Fiorentina", icon: "💜", logo: fiorentinaLogo },
      { name: "Genoa", shortName: "Genoa", icon: "🔴", logo: genoaLogo },
      { name: "Inter Milan", shortName: "Inter", icon: "🖤", logo: interLogo },
      { name: "Juventus", shortName: "Juventus", icon: "⚫", logo: juventusLogo },
      { name: "Lazio", shortName: "Lazio", icon: "🦅", logo: lazioLogo },
      { name: "Lecce", shortName: "Lecce", icon: "💛", logo: lecceLogo },
      { name: "Monza", shortName: "Monza", icon: "🔴", logo: monzaLogo },
      { name: "Napoli", shortName: "Napoli", icon: "💙", logo: napoliLogo },
      { name: "Roma", shortName: "Roma", icon: "🐺", logo: romaLogo },
      { name: "Sampdoria", shortName: "Sampdoria", icon: "🔵", logo: sampodoriaLogo },
      { name: "Sassuolo", shortName: "Sassuolo", icon: "💚", logo: sassuoloLogo },
      { name: "Salernitana", shortName: "Salernitana", icon: "🔴", logo: salerntianaLogo },
      { name: "Torino", shortName: "Torino", icon: "🐂", logo: torinoLogo },
      { name: "Udinese", shortName: "Udinese", icon: "⚫", logo: udineseLogo },
      { name: "Verona", shortName: "Verona", icon: "💛", logo: veronaLogo },
    ],
  },
  {
    name: "Bundesliga",
    country: "Germany",
    countryCode: "de",
    flag: "🇩🇪",
    teams: [
      { name: "Augsburg", shortName: "Augsburg", icon: "🔴", logo: augsburgLogo },
      { name: "Bayer Leverkusen", shortName: "Leverkusen", icon: "🔴", logo: leverkusenLogo },
      { name: "Bayern Munich", shortName: "Bayern", icon: "🔴", logo: bayernLogo },
      { name: "Bochum", shortName: "Bochum", icon: "🔵", logo: bochumLogo },
      { name: "Borussia Dortmund", shortName: "Dortmund", icon: "💛", logo: dortmundLogo },
      { name: "Borussia M'gladbach", shortName: "Gladbach", icon: "⚫", logo: gladbachLogo },
      { name: "Cologne", shortName: "Cologne", icon: "🔴", logo: kolnLogo },
      { name: "Eintracht Frankfurt", shortName: "Frankfurt", icon: "🦅", logo: frankfurtLogo },
      { name: "Freiburg", shortName: "Freiburg", icon: "⚫", logo: freiburgLogo },
      { name: "Hertha Berlin", shortName: "Hertha", icon: "🔵", logo: herthaLogo },
      { name: "Hoffenheim", shortName: "Hoffenheim", icon: "🔵", logo: hoffenheimLogo },
      { name: "Mainz", shortName: "Mainz", icon: "🔴", logo: mainzLogo },
      { name: "RB Leipzig", shortName: "Leipzig", icon: "🐂", logo: leipzigLogo },
      { name: "Schalke", shortName: "Schalke", icon: "🔵", logo: schalke04Logo },
      { name: "Stuttgart", shortName: "Stuttgart", icon: "⚪", logo: stuttgartLogo },
      { name: "Union Berlin", shortName: "Union", icon: "🔴", logo: unionLogo },
      { name: "Werder Bremen", shortName: "Bremen", icon: "💚", logo: bremenLogo },
      { name: "Wolfsburg", shortName: "Wolfsburg", icon: "💚", logo: wolfsburgLogo },
    ],
  },
  {
    name: "Kenyan Premier League",
    country: "Kenya",
    countryCode: "ke",
    flag: "🇰🇪",
    teams: [
      { name: "AFC Leopards", shortName: "Leopards", icon: "🐆", logo: afcLeopardsLogo },
      { name: "Bandari", shortName: "Bandari", icon: "⚓", logo: bandariLogo },
      { name: "Bidco United", shortName: "Bidco", icon: "🏭", logo: bidcoLogo },
      { name: "Gor Mahia", shortName: "Gor Mahia", icon: "💚", logo: gorMahiaLogo },
      { name: "Kakamega Homeboyz", shortName: "Homeboyz", icon: "🏠", logo: homeboyzLogo },
      { name: "Kariobangi Sharks", shortName: "Sharks", icon: "🦈", logo: sharksLogo },
      { name: "KCB", shortName: "KCB", icon: "🏦", logo: kcbLogo },
      { name: "Mathare United", shortName: "Mathare", icon: "🔵", logo: mathareLogo },
      { name: "Murang'a SEAL", shortName: "Murang'a", icon: "🛡️", logo: murangaLogo },
      { name: "Nairobi City Stars", shortName: "City Stars", icon: "⭐", logo: cityStarsLogo },
      { name: "Nzoia Sugar", shortName: "Nzoia", icon: "🌾", logo: nzoiaLogo },
      { name: "Posta Rangers", shortName: "Rangers", icon: "📮", logo: postaLogo },
      { name: "Shabana", shortName: "Shabana", icon: "⚽", logo: shabanaLogo },
      { name: "Sofapaka", shortName: "Sofapaka", icon: "🛋️", logo: sofapakaLogo },
      { name: "Tusker", shortName: "Tusker", icon: "🍺", logo: tuskerLogo },
      { name: "Ulinzi Stars", shortName: "Ulinzi", icon: "⭐", logo: ulinziLogo },
      { name: "Wazito", shortName: "Wazito", icon: "💰", logo: wazitoLogo },
      { name: "Zoo Kericho", shortName: "Zoo", icon: "🦁", logo: zooLogo },
    ],
  },
];
