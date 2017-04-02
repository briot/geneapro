#!/usr/bin/env python
"""
Dummy file to test graph layout
"""

import sys
import geneaprove.utils.graphs as graphs

links = [(1, 3), (2, 3), (3, 7),
         (4, 5), (5, 6), (6, 7),
         (7, 8), (7, 9), (9, 10)]

links = [("a", "b"), ("b", "c"), ("c", "d"),
         ("e", "g"), ("f", "g"), ("g", "h"),
         ("d", "h"), ("a", "e"), ("a", "f"),

         ("a", "i"),
         ("c", "i", 0)]  # same layer

g = graphs.Digraph(edges=links)


def preferred_length(e):
    if len(e) >= 3:
        return e[2]
    return 1


def check(ranks):
    """
    Verify whether the proposed layers are feasible.
    """
    print("Ranks: ", ranks)

    previous = None
    for r in sorted(ranks, key=lambda k: ranks[k]):
        if ranks[r] != previous:
            if previous is not None:
                sys.stdout.write("\n")
            previous = ranks[r]
            sys.stdout.write("%2d" % previous)
        sys.stdout.write(" %s" % r)
    sys.stdout.write("\n")

    total = 0
    for n in links:
        slack = ranks[n[1]] - ranks[n[0]] - preferred_length(n)
        if slack < 0:
            print("Error in link ", n)
        total += slack

    print("Total slack for tree: ", total)


check(g.rank_longest_path(preferred_length=preferred_length))
check(g.rank_minimize_dummy_vertices(preferred_length=preferred_length))
