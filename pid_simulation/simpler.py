import pandas
import numpy
import numpy.random
from plotnine import *
import math

N = 365

def get_flips(prob_flip = None):
    if prob_flip is None:
        prob_flip = 30 / N
    sample = numpy.random.uniform(low=0, high=1, size=N)
    sample = sample < prob_flip
    return sample

def get_time():
    return numpy.linspace(start = 0, stop = 1, num = N)

def get_rates():
    flips = get_flips()
    time = get_time()

    initial_rate = 0.06
    gamma = 1.0 / initial_rate
    time_of_last_flip = time[0]
    rate_at_last_flip = initial_rate
    S = 1

    is_above = True

    rate_path = []
    i = -1
    for (t, is_flipped_now) in zip(time, flips):
        dt = t - time_of_last_flip
        sr0 = rate_at_last_flip * S
        if is_above:
            new_rate = rate_at_last_flip - 1.0 / (dt * gamma + 1.0 /sr0) + sr0
        else:
            new_rate = rate_at_last_flip + 1.0/(dt * gamma + 1.0/sr0) - sr0

        rate_path.append(new_rate)

        if is_flipped_now:
            is_above = not is_above
            rate_at_last_flip = new_rate
            time_of_last_flip = t

        i += 1

    return rate_path

def get_many_rates(paths=20):
    return {f'rate{i+1}': get_rates() for i in range(paths)}

def main():
    time = get_time()
    data_dict = get_many_rates()
    data_dict['time'] = time
    data = pandas.DataFrame(data_dict)
    data = data.melt(id_vars='time', var_name='path', value_name='rate')
    print(data)
    print(ggplot(data, aes(x = 'time', y = 'rate', colour='path'))
          + geom_line()
          + theme_bw()
          + scale_color_discrete(guide=False)
          + xlab('Time in Years')
          + ylab('Interest Rate')
          + ggtitle('Interest Rate vs Time in Years')
          )

def presentation_chart():
    time = get_time()
    r0 = 0.06
    gamma = 100

    upper = r0 - 1.0 / (time*gamma + 1.0 / r0) + r0
    lower = r0 + 1.0 / (time*gamma + 1.0 / r0) - r0
    data = pandas.DataFrame({'Time': time, 'High Utilization': upper, 'Low Utilization': lower})
    data = data.melt(id_vars='Time', var_name='Mode', value_name='Rate')

    print(
        ggplot(data, aes(x = 'Time', y = 'Rate', colour='Mode'))
        + geom_line()
        + theme_bw()
        + theme(subplots_adjust={'right': 0.75})
        + ggtitle('Rate vs Time')
    )

if __name__ == '__main__':
    presentation_chart()