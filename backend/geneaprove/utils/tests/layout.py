#!/usr/bin/env python
import geneaprove.utils.graphs as graphs

# Tests the various layout algorithms, see the example in
# http://www.google.fr/url?sa=t&rct=j&q=&esrc=s&source=web&cd=2&cad=rja&\
# ved=0CEIQFjAB&url=http%3A%2F%2Fsydney.edu.au%2Fengineering%2Fit%\
# 2F~visual%2Fcomp4048%2Fslides03.ppt&ei=3JQKUdnWAYOJtAb6roCwBg&\
# usg=AFQjCNE4FJlFlXOVvpneNmgMDYbGv3TN2Q&sig2=2PTvTgkx3fhzwDmYxCBiTA&\
# bvm=bv.41642243,d.Yms

links = [(18, 5), (9, 18), (15, 6), (9, 6), (4, 9),
         (19, 17), (17, 6), (17, 7), (20, 7), (13, 20),
         (4, 13), (12, 4), (12, 13), (21, 12), (21, 7),
         (3, 7), (11, 3), (2, 11), (21, 10), (16, 10),
         (0, 16), (8, 0), (8, 14), (1, 14)]

g = graphs.Digraph(edges=links)


def compare(algo, expect, actual):
    if len(expect) != len(actual):
        print(f"{algo}: Incorrect number of layers: expected={len(expected)}, got={len(actual)}")
        print(f"{algo}: result={actual}")

    for layer in range(0, len(expect)):
        if sorted(expect[layer]) != sorted(actual[layer]):
            print(f"{algo}: Incorrect layer {layer}:")
            print(f"  expected={sorted(expect[layer])}")
            print(f"  result  ={sorted(actual[layer])}")

# Longest path layering
# This algorithm does not optimize the length of the paths. For instance,
# node 14 should be just one layer below 8, not at the bottom.
# The resulting layout is wider than needed.


layers = g.rank_longest_path()
result = g.get_layers(layers)

expected = [[5, 6, 7, 10, 14],
            [18, 15, 17, 20, 3, 16, 1],
            [9, 19, 13, 11, 0],
            [4, 2, 8],
            [12],
            [21]]
compare("Longest path layering", expected, result)


# Network Simplex Layering (AT&T 1993)
# This algorithm minimizes the length of the edges.
# This is an integer linear programming problem: the goal is to chose the
# y-coordinates, so that f is minized, where:
#
#   f = Sum(foreach_edge(u,v),   y(u) - y(v) - 1)
#   f = sum of vertical spans of the edges in the layering
#
# See also [Sander 96]
#     1. Calculate y by DFS or BFS
#     2. Calculate minimum cost spanning trees
#     3. Apply spring embedder
#
# The AT&T implementation is described at
#     http://graphviz.org/Documentation/TSE93.pdf

layers = g.rank_minimize_dummy_vertices()
result = g.get_layers(layers)
expected = [[5, 6, 7],
            [18, 15, 17, 20, 3],
            [9, 19, 13, 11],
            [4, 2],
            [10, 12],
            [16, 21],
            [14, 0],
            [1, 8]]
compare("Network Simplex", expected, result)
