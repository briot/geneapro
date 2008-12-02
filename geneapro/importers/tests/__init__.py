import unittest

class ImporterTestCase (unittest.TestCase):
	def setUp (self):
		self.foo = 1

	def testBasic(self):
		print "Running testBasic"
		self.assertEquals (1, self.foo)
		#self.assertEquals (0, self.foo)

