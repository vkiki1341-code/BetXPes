/**
 * MatchAtTime Component
 * Allows users to view what matches are playing at any given time
 * Supports past, present, and future time predictions
 */

import React, { useState } from 'react';
import { Match } from '@/types/betting';
import { useMatchAtTime, useScheduleInfo, useRealTimeCountdown } from '@/hooks/useCurrentMatch';
import { formatScheduledTime } from '@/lib/matchScheduleService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MatchAtTimeProps {
  allMatches: Match[];
  onMatchSelect?: (match: Match) => void;
}

export const MatchAtTime: React.FC<MatchAtTimeProps> = ({ allMatches, onMatchSelect }) => {
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const scheduledMatch = useMatchAtTime(selectedTime, allMatches);
  const scheduleInfo = useScheduleInfo(scheduledMatch || null);
  const countdown = useRealTimeCountdown(scheduleInfo?.scheduledTime || null);

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    setSelectedTime(newDate);
  };

  const handlePreviousDay = () => {
    const newDate = new Date(selectedTime);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedTime(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedTime);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedTime(newDate);
  };

  const handleNow = () => {
    setSelectedTime(new Date());
  };

  const handleSelectMatch = () => {
    if (scheduledMatch) {
      const match = allMatches.find((m) => m.id === scheduledMatch.matchId);
      if (match && onMatchSelect) {
        onMatchSelect(match);
      }
    }
  };

  const dateTimeStr = selectedTime.toISOString().slice(0, 16);

  return (
    <div className="w-full space-y-4">
      {/* Time Picker */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Match Time Predictor</CardTitle>
          <CardDescription>
            Select any time to see which match will be playing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date/Time Input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Select Date & Time</label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={dateTimeStr}
                onChange={handleDateTimeChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleNow}
                className="whitespace-nowrap"
              >
                Now
              </Button>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousDay}
              className="w-full"
            >
              ← Previous Day
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextDay}
              className="w-full"
            >
              Next Day →
            </Button>
          </div>

          {/* Current Selection Info */}
          <div className="p-3 bg-gray-50 rounded-md text-sm">
            <div className="font-semibold text-gray-700">
              {selectedTime.toLocaleString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match Display */}
      {scheduledMatch && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg text-green-900">
              Match Playing at This Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Match Info */}
            <div className="space-y-3">
              {/* Home Team */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex flex-col">
                  <div className="text-sm font-semibold text-gray-700">
                    {scheduledMatch.homeTeam}
                  </div>
                  <div className="text-xs text-gray-500">Home</div>
                </div>
              </div>

              {/* VS */}
              <div className="flex items-center justify-center">
                <div className="text-lg font-bold text-gray-500">VS</div>
              </div>

              {/* Away Team */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex flex-col">
                  <div className="text-sm font-semibold text-gray-700">
                    {scheduledMatch.awayTeam}
                  </div>
                  <div className="text-xs text-gray-500">Away</div>
                </div>
              </div>
            </div>

            {/* Schedule Details */}
            {scheduleInfo && (
              <div className="space-y-2 p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Day:</span>
                  <span className="font-semibold">{scheduleInfo.dayOfWeek}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-semibold">{scheduleInfo.formattedDate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-semibold">{scheduleInfo.formattedTime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-semibold">
                    {scheduleInfo.isPast ? '❌ Finished' : scheduleInfo.isToday ? '🔴 Today' : '🔵 Future'}
                  </span>
                </div>
              </div>
            )}

            {/* Countdown */}
            {countdown && !scheduleInfo?.isPast && (
              <div className="p-3 bg-blue-100 rounded-lg border border-blue-300">
                <div className="text-center">
                  <div className="text-xs text-blue-600 font-medium mb-1">
                    Starts in
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {countdown.displayText}
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Index Info */}
            <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded text-center">
              Schedule Index: {scheduledMatch.scheduleIndex}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSelectMatch}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Place Bet on This Match
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!scheduledMatch && (
        <Card className="border-gray-200">
          <CardContent className="pt-6 text-center text-gray-500">
            <p>No match found for the selected time.</p>
            <p className="text-sm mt-2">Try a different date or time.</p>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-sm text-purple-900">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-purple-800 space-y-2">
          <p>
            ✓ The system schedules matches based on a global reference time
          </p>
          <p>
            ✓ Every {30} minutes, a new match begins automatically
          </p>
          <p>
            ✓ You can predict which match will be playing at any future time
          </p>
          <p>
            ✓ Matches cycle through all available teams repeatedly
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchAtTime;
