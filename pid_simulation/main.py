#! /usr/bin/env python
import random
import unittest
from enum import Enum
from typing import *
import pandas

class Act(Enum):
    SUPPLY = 1
    WITHDRAW = 2
    BORROW = 3
    REPAY = 4
    NOP = 5

class Action:
    def __init__(self, act: Act, amount: float):
        self.act = act
        self.amount = amount

    def __str__(self):
        return f"{self.act} {self.amount}"

class Record:
    def __init__(self, time, rate, supply, borrow):
        self.time = time
        self.rate = rate
        self.supply = supply
        self.borrow = borrow

class Simulation:
    def __init__(self):
        self.tick = 1.0/256.0
        self.current_time = 0
        self.initial_interest_rate = 0.03
        self.maximum_interest_rate = 0.06
        self.target_utilization = 0.8
        self.number_of_actors = 1000
        self.supplied = 0
        self.borrowed = 0

        self.current_interest_rate = self.initial_interest_rate
        self.rate_at_last_cross = self.initial_interest_rate
        self.time_of_last_cross = self.current_time
        self.previous_utilization = self.get_utilization()
        self.actors = [Actor() for _ in range(self.number_of_actors)]
        self.records = []

    def get_current_utilization(self):
        if self.borrowed == 0:
            return 0

        return float(self.supplied) / float(self.borrowed)

    def apply_action(self, action: Action) -> bool:
        if action.act == Act.NOP:
            return True

        if action.act == Act.WITHDRAW and self.supplied - action.amount < self.borrowed:
            #print('warning - attempt to withdraw but amount is locked up')
            return False

        if action.act == Act.BORROW and self.borrowed + action.amount > self.supplied:
            #print('warning - attempt to borrow more than total supply')
            return False

        if action.act == Act.SUPPLY:
            self.supplied += action.amount
        if action.act == Act.WITHDRAW:
            self.supplied -= action.amount
        if action.act == Act.BORROW:
            self.borrowed += action.amount
        if action.act == Act.REPAY:
            self.borrowed -= action.amount

        return True

    def get_utilization(self):
        if self.supplied == 0:
            return 0.0

        return float(self.borrowed) / float(self.supplied)

    def get_current_interest_rate(self):
        utilization = self.get_utilization()
        dt = self.current_time -  self.time_of_last_cross
        if utilization > self.target_utilization:
            return self.rate_at_last_cross - 1.0/(dt + 1.0 / self.maximum_interest_rate) + self.maximum_interest_rate
        else:
            return self.rate_at_last_cross + 1.0/(dt + 1.0 / self.rate_at_last_cross) - self.rate_at_last_cross

    def detect_cross_and_update(self):
        utilization = self.get_utilization()
        if (utilization > self.target_utilization and self.previous_utilization <= self.target_utilization) \
                or (utilization < self.target_utilization and self.previous_utilization >= self.target_utilization):
            self.time_of_last_cross = self.current_time
            self.rate_at_last_cross = self.current_interest_rate

    def get_record(self):
        return Record(self.current_time, self.current_interest_rate, self.supplied, self.borrowed)

    def step(self):
        for actor in self.actors:
            action = actor.get_action(self.initial_interest_rate, self.current_interest_rate, self.maximum_interest_rate)
            if self.apply_action(action):
                actor.apply_action(action)

        self.records.append(self.get_record())
        self.current_interest_rate = self.get_current_interest_rate()
        self.detect_cross_and_update()
        self.previous_utilization = self.get_utilization()
        self.current_time += self.tick

    def run_for(self, time_in_years: float):
        steps = int(time_in_years / self.tick)
        for step in range(steps):
            self.step()



class Actor:
    def __init__(self):
        self.cash = 1.0
        self.borrowed = 0
        self.supplied = 0

    def get_probability_to_supply(self, initial_rate: float, current_rate: float, maximum_rate: float) -> float:
        """
        the probability to supply is high as the rate gets higher
        at initial rate is 50/50 at max rate is 1 at 0 rate is 0
        the shape is linear with a kink at 0.5 to change slope

        :param initial_rate:
        :param current_rate:
        :param maximum_rate:
        :return:
        """
        if current_rate > initial_rate:
            return 0.5 * (current_rate - initial_rate) / (maximum_rate - initial_rate) + 0.5
        else:
            return 0.5 * current_rate / initial_rate

    def get_roll(self):
        return random.random()

    def apply_action(self, action):
        if action.act == Act.NOP:
            return

        if action.act == Act.SUPPLY:
            self.supplied = self.cash
            self.cash = 0
        if action.act == Act.WITHDRAW:
            self.cash = self.supplied
            self.supplied = 0
        if action.act == Act.BORROW:
            self.borrowed = self.cash
            self.cash = 0
        if action.act == Act.REPAY:
            self.cash = self.borrowed
            self.borrowed = 0

    def get_action(self, initial_rate: float, current_rate: float, maximum_rate: float) -> Action:
        probability_to_supply = self.get_probability_to_supply(initial_rate, current_rate, maximum_rate)
        roll = self.get_roll()

        if roll < probability_to_supply:
            if self.supplied > 0:
                return Action(Act.NOP, 0)
            if self.borrowed > 0:
                return Action(Act.REPAY, self.borrowed)
            if self.supplied == 0:
                return Action(Act.SUPPLY, self.cash)
        else:
            if self.borrowed > 0:
                return Action(Act.NOP, 0)
            if self.supplied > 0:
                return Action(Act.WITHDRAW, self.supplied)
            if self.borrowed == 0:
                return Action(Act.BORROW, self.cash)

        return Action(Act.NOP, 0)


class Tests(unittest.TestCase):

    def test_get_probability_to_supply(self):
        initial_rate = 0.03
        maximum_rate = 0.2
        actor = Actor()
        p = actor.get_probability_to_supply(initial_rate, initial_rate, maximum_rate)
        self.assertAlmostEqual(p, 0.5, 5)
        p = actor.get_probability_to_supply(initial_rate, maximum_rate, maximum_rate)
        self.assertAlmostEqual(p, 1, 5)
        p = actor.get_probability_to_supply(initial_rate, 0, maximum_rate)
        self.assertAlmostEqual(p, 0, 5)
        p = actor.get_probability_to_supply(initial_rate,( initial_rate + maximum_rate) / 2.0, maximum_rate)
        self.assertAlmostEqual(p, 0.75, 5)
        p = actor.get_probability_to_supply(initial_rate, initial_rate  / 2.0, maximum_rate)
        self.assertAlmostEqual(p, 0.25, 5)

    def test_run(self):
        sim = Simulation()
        sim.step()

def records_to_data_frame(records) -> pandas.DataFrame:
    times = [r.time for r in records]
    rates = [r.rate for r in records]
    supplies = [r.supply for r in records]
    borrows = [r.borrow for r in records]

    data = pandas.DataFrame({'times' : times, 'rates' : rates, 'supplies' : supplies, 'borrows' : borrows})
    data['utilization'] = data['borrows'] / data['supplies']
    return data


def save(records):
    data = records_to_data_frame(records)
    data.to_csv('data.csv', index = False)

def view(records: List[Record]):
    from plotnine import ggplot, geom_line, aes, theme_bw

    data = records_to_data_frame(records)
    print(ggplot(data, aes(x = 'times', y = 'rates')) + geom_line() + theme_bw())
    print(ggplot(data, aes(x = 'times', y = 'utilization')) + geom_line() + theme_bw())

def main():
    sim = Simulation()
    sim.run_for(1)
    view(sim.records)

if __name__ == '__main__':
    main()