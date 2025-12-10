/**
 * Match Predictor Component
 * Allows users to see what match will be playing at any date/time
 * Shows past, current, and future matches
 */

import React, { useState } from 'react';
import { Match } from '@/types/betting';
import { getMatchAtTime } from '@/utils/globalTimeMatchSystem';
import { useMatchScheduleInfo } from '@/hooks/useGlobalTimeMatches';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Search } from 'lucide-react';

export const MatchPredictor: React.FC = () => {
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [predictedMatch, setPredictedMatch] = useState<Match | null>(null);
  const scheduleInfo = useMatchScheduleInfo(predictedMatch);

  const handleSearch = (time: Date) => {
    setSelectedTime(time);
    const match = getMatchAtTime(time);
    setPredictedMatch(match);
  };

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      handleSearch(newDate);
    }
  };

  const handleQuickSelect = (hoursFromNow: number) => {
    const time = new Date();
    time.setHours(time.getHours() + hoursFromNow);
    handleSearch(time);
  };

  const handleSetToNow = () => {
    handleSearch(new Date());
  };

  const dateTimeStr = selectedTime.toISOString().slice(0, 16);

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Search className="w-5 h-5" />
            Match Predictor
          </CardTitle>
          <CardDescription className="text-blue-800">
            Predict which match will be playing at any date and time
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Time Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Date & Time</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date/Time Input */}
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={dateTimeStr}
              onChange={handleDateTimeChange}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={handleSetToNow} variant="outline" size="sm">
              Now
            </Button>
          </div>

          {/* Quick Selection Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect(0)}
              className="text-xs"
            >
              Now
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect(1)}
              className="text-xs"
            >
              +1 Hour
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect(3)}
              className="text-xs"
            >
              +3 Hours
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect(24)}
              className="text-xs"
            >
              Tomorrow
            </Button>
          </div>

          {/* Selected Time Display */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-600 font-semibold mb-1">
              SELECTED TIME
            </div>
            <div className="font-semibold text-gray-800">
              {selectedTime.toLocaleString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predicted Match */}
      {predictedMatch && scheduleInfo && (
        <Card className={`border-2 ${
          scheduleInfo.isPast ? 'border-gray-300 bg-gray-50' :
          scheduleInfo.isToday ? 'border-red-300 bg-red-50' :
          'border-green-300 bg-green-50'
        }`}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {scheduleInfo.isPast ? '❌ Past Match' : 
               scheduleInfo.isToday ? '🔴 Playing Today' : 
               '🔵 Upcoming Match'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Teams */}
            <div className="space-y-3">
              {/* Home */}
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <div className="text-xs text-gray-600 font-semibold mb-1">HOME</div>
                <div className="text-lg font-bold text-gray-800">
                  {predictedMatch.homeTeam.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {predictedMatch.homeTeam.shortName}
                </div>
              </div>

              {/* VS */}
              <div className="flex justify-center">
                <div className="text-sm font-bold text-gray-500 px-3 py-1 bg-gray-100 rounded">
                  VS
                </div>
              </div>

              {/* Away */}
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <div className="text-xs text-gray-600 font-semibold mb-1">AWAY</div>
                <div className="text-lg font-bold text-gray-800">
                  {predictedMatch.awayTeam.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {predictedMatch.awayTeam.shortName}
                </div>
              </div>
            </div>

            {/* Schedule Info */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-white rounded-lg border border-gray-200">
              <div>
                <div className="text-xs text-gray-600 font-semibold">DATE</div>
                <div className="text-sm font-bold text-gray-800 mt-1">
                  {scheduleInfo.dayOfWeek}
                </div>
                <div className="text-xs text-gray-500">
                  {scheduleInfo.formattedDate}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 font-semibold">TIME</div>
                <div className="text-sm font-bold text-gray-800 mt-1">
                  {scheduleInfo.formattedTime}
                </div>
                <div className="text-xs text-gray-500">
                  {scheduleInfo.isTomorrow ? 'Tomorrow' : 
                   scheduleInfo.isToday ? 'Today' : 
                   'Future'}
                </div>
              </div>
            </div>

            {/* Odds */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-white rounded-lg border border-gray-200">
              <div>
                <div className="text-xs text-gray-600 font-semibold">OVER</div>
                <div className="text-lg font-bold text-blue-600 mt-1">
                  {predictedMatch.overOdds}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 font-semibold">UNDER</div>
                <div className="text-lg font-bold text-blue-600 mt-1">
                  {predictedMatch.underOdds}
                </div>
              </div>
            </div>

            {/* Status Badge */}
            {!scheduleInfo.isPast && (
              <div className="p-3 bg-blue-100 rounded-lg border border-blue-300 text-center">
                <div className="text-xs text-blue-600 font-semibold mb-1">STATUS</div>
                <div className="text-sm font-bold text-blue-900">
                  🎯 Can place bets {scheduleInfo.isTomorrow ? 'tomorrow' : 'at this time'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!predictedMatch && selectedTime && (
        <Card className="border-gray-200">
          <CardContent className="pt-6 text-center text-gray-500">
            <p>No match found for the selected time.</p>
            <p className="text-sm mt-2">Try a different date or time.</p>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-sm text-purple-900">📋 How Predictions Work</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-purple-800 space-y-2">
          <p>
            • Every 30 minutes, a new match automatically starts globally
          </p>
          <p>
            • All users see the same match at the same time
          </p>
          <p>
            • You can predict which match will play at any future time
          </p>
          <p>
            • Matches cycle through all available teams
          </p>
          <p>
            • Try predicting matches for tomorrow, next week, or any date!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchPredictor;
