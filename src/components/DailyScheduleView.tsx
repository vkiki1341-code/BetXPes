/**
 * Daily Schedule View Component
 * Shows all matches scheduled for a specific day
 */

import React, { useState } from 'react';
import { Match } from '@/types/betting';
import {
  generateScheduleForDateRange,
  groupByDate,
  ScheduledMatchData,
} from '@/lib/scheduleGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DailyScheduleViewProps {
  allMatches: Match[];
  onMatchSelect?: (match: Match) => void;
}

export const DailyScheduleView: React.FC<DailyScheduleViewProps> = ({
  allMatches,
  onMatchSelect,
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // Generate schedule based on view mode
  const generateSchedule = () => {
    if (viewMode === 'day') {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      return generateScheduleForDateRange(allMatches, startOfDay, endOfDay);
    } else {
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      return generateScheduleForDateRange(allMatches, startOfWeek, endOfWeek);
    }
  };

  const schedule = generateSchedule();
  const grouped = groupByDate(schedule);
  const dates = Object.keys(grouped).sort();

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleSelectMatch = (match: ScheduledMatchData) => {
    if (onMatchSelect) {
      onMatchSelect({
        id: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        kickoffTime: match.kickoffTime,
        overOdds: match.overOdds,
        underOdds: match.underOdds,
        outcome: match.outcome,
      });
    }
  };

  const dateDisplay = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Calendar className="w-5 h-5" />
            Daily Match Schedule
          </CardTitle>
          <CardDescription className="text-blue-800">
            View all matches scheduled for a specific date
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Date Navigation */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousDay}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="text-center flex-1">
              <div className="text-sm font-semibold text-gray-700">{dateDisplay}</div>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextDay}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('day')}
              className="flex-1"
            >
              Day View
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
              className="flex-1"
            >
              Week View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="px-3"
            >
              Today
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Matches List */}
      {dates.length > 0 ? (
        <div className="space-y-3">
          {dates.map((date) => (
            <div key={date} className="space-y-2">
              {/* Date Header */}
              <div className="px-3 py-2 bg-gray-100 rounded-lg">
                <div className="font-semibold text-gray-800 text-sm">
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-xs text-gray-600">
                  {grouped[date].length} matches
                </div>
              </div>

              {/* Matches for this date */}
              <div className="space-y-2">
                {grouped[date].map((match) => (
                  <Card
                    key={match.scheduleIndex}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleSelectMatch(match)}
                  >
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between">
                        {/* Time */}
                        <div className="text-center min-w-16">
                          <div className="text-2xl font-bold text-blue-600">
                            {match.matchTime}
                          </div>
                          <div className="text-xs text-gray-500">
                            Index: {match.scheduleIndex}
                          </div>
                        </div>

                        {/* Match Details */}
                        <div className="flex-1 mx-4 text-center">
                          <div className="flex items-center justify-between">
                            {/* Home Team */}
                            <div className="flex-1">
                              <div className="font-semibold text-gray-800 text-sm">
                                {match.homeTeam.name}
                              </div>
                            </div>

                            {/* VS */}
                            <div className="px-2">
                              <div className="text-xs font-bold text-gray-500">VS</div>
                            </div>

                            {/* Away Team */}
                            <div className="flex-1 text-right">
                              <div className="font-semibold text-gray-800 text-sm">
                                {match.awayTeam.name}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Odds */}
                        <div className="text-right min-w-24 text-xs">
                          <div className="text-gray-600">
                            <span className="font-semibold">Over:</span> {match.overOdds}
                          </div>
                          <div className="text-gray-600">
                            <span className="font-semibold">Under:</span> {match.underOdds}
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      <Button
                        size="sm"
                        className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectMatch(match);
                        }}
                      >
                        Bet Now
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-gray-200">
          <CardContent className="pt-6 text-center text-gray-500">
            <p>No matches scheduled for this date.</p>
            <p className="text-sm mt-2">Try selecting a different date.</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Footer */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="pt-4 pb-4 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Total matches shown: {schedule.length}</span>
            <span>
              Viewing: {dates.length} {dates.length === 1 ? 'day' : 'days'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyScheduleView;
