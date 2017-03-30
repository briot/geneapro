"""
Just a test for the barycenter heuristic in graph layout.
"""

import sys

layer1 = ["A", "B", "C", "D"]
layer2 = ["1", "2", "3", "4", "5"]
links = set([("A", "2"),
             ("A", "4"),
             ("B", "1"),
             ("B", "3"),
             ("B", "5"),
             ("C", "2"),
             ("C", "4"),
             ("C", "5"),
             ("D", "1"),
             ("D", "2"),
             ("D", "3")])

layers = [["Re", "Ma", "Ja", "Jo", ".."],
          ["An", "Gl", "..", "Gn", "Ro"],
          ["Em", "..", "MH", "QQ"],
          ["Er", "HH", "Ti", "..", "Al"]]
links = set([("An", "Em"),
             ("Ro", "Em"),
             ("Gl", "MH"),
             ("Gi", "MH"),
             ("Em", "Er"), ("Em", "Al"), ("Em", "Ti"),
             ("MH", "Er"), ("MH", "Al"), ("MH", "Ti"),
             ("Re", "An"),
             ("Ja", "An"),
             ("Jo", "Ro"),
             ("Ma", "Ro"),
             ("QQ", "HH"),
             ])


def show_matrix():
    sys.stdout.write("  ")
    for l in layers:
        for n in l:
            sys.stdout.write("%2s" % n)
        sys.stdout.write("|")
    sys.stdout.write("\n")

    for l in layers:
        for n in l:
            sys.stdout.write("%2s " % n)

            for l2 in layers:
                for n2 in l2:
                    if (n, n2) in links:
                        sys.stdout.write("XX")
                    else:
                        sys.stdout.write("  ")
                sys.stdout.write("|")
            sys.stdout.write("\n")
        sys.stdout.write("-" * 40 + "\n")
    print ""


def barycenter_heuristic(layers, links):
    def order_layer1(layer1, layer2):
        weights = {}
        for n in layer1:
            total = 0
            count = 1
            for index2, n2 in enumerate(layer2):
                if (n, n2) in links:
                    total += index2 + 1
                    count += 1
            weights[n] = float(total) / float(count)

        layer1.sort(key=lambda x: weights[x])

    def order_layer2(layer1, layer2):
        weights = {}
        for n2 in layer2:
            total = 0
            count = 1
            for index, n in enumerate(layer1):
                if (n, n2) in links:
                    total += index + 1
                    count += 1
            weights[n2] = float(total) / float(count)

        layer2.sort(key=lambda x: weights[x])

    for index, layer in enumerate(layers):
        if index > 0:
            order_layer1(layers[index - 1], layer)
    order_layer2(layers[len(layers) - 2], layers[len(layers) - 1])


show_matrix()
barycenter_heuristic(layers, links)
show_matrix()
