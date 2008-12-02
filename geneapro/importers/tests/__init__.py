import unittest

class ImporterTestCase (unittest.TestCase):
	def setUp (self):
		self.foo = 1

	def testBasic(self):
		self.assertEquals (1, self.foo)

